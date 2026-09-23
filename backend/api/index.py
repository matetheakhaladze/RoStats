"""RoStats API. FastAPI app deployed as one Vercel serverless function.

Auth:      GET  /api/auth/login, GET /api/auth/callback   (Sign in with Roblox, OAuth 2.0 + PKCE)
Account:   GET  /api/me, DELETE /api/me
Games:     POST /api/games, DELETE /api/games/{universe_id}, GET /api/games/stats
Data:      GET/POST /api/datasets, DELETE /api/datasets/{id}
AI:        POST /api/chat, POST /api/insights, POST /api/art, GET /api/art/history, GET /api/art/image/{id}
Public:    GET  /api/health, GET /api/market, /api/market/rising, /api/market/category, /api/market/snapshot, GET /api/roblox/home-sample, GET /api/roblox/games

Every AI endpoint needs a signed-in Pro user and is limited per user, so nobody can
spend the Gemini key through the public URL.
"""
import asyncio
import base64
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import uuid
from typing import Literal
from urllib.parse import urlencode, urlparse

import httpx
import psycopg
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse, Response
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from pydantic import BaseModel, Field

# ---------------------------------------------------------------- config

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
GEMINI_CHAT_MODEL = os.environ.get("GEMINI_CHAT_MODEL", "gemini-flash-lite-latest")
GEMINI_IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-lite-image")
CHAT_MAX_TOKENS = int(os.environ.get("CHAT_MAX_TOKENS", "400"))

DATABASE_URL = (
    os.environ.get("DATABASE_URL")
    or os.environ.get("POSTGRES_URL")
    or os.environ.get("POSTGRES_PRISMA_URL")
    or ""
)
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")
ROBLOX_CLIENT_ID = os.environ.get("ROBLOX_CLIENT_ID", "")
ROBLOX_CLIENT_SECRET = os.environ.get("ROBLOX_CLIENT_SECRET", "")
PUBLIC_API_URL = os.environ.get("PUBLIC_API_URL", "https://rostats-api.vercel.app").rstrip("/")
ALLOWED_RETURN_ORIGINS = [
    o.strip().rstrip("/")
    for o in os.environ.get(
        "ALLOWED_RETURN_ORIGINS",
        "https://matetheakhaladze.github.io,http://localhost:5173,http://localhost:4173",
    ).split(",")
    if o.strip()
]
# Roblox user IDs that always get Pro (the owner, testers). Comma separated.
OWNER_IDS = {int(x) for x in re.findall(r"\d+", os.environ.get("OWNER_ROBLOX_IDS", ""))}

PRO_MONTHLY_CREDITS = int(os.environ.get("PRO_MONTHLY_CREDITS", "100"))
PRO_DAILY_CHATS = int(os.environ.get("PRO_DAILY_CHATS", "50"))
FREE_GAMES = 1
HISTORY_KEEP = 12  # generated images kept per user

SESSION_DAYS = 30

app = FastAPI(title="RoStats API", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(httpx.HTTPError)
async def upstream_error(_, exc: httpx.HTTPError):
    return JSONResponse({"detail": f"Upstream request failed ({exc.__class__.__name__}). Try again."}, status_code=502)


# ---------------------------------------------------------------- database

SCHEMA = """
create table if not exists users (
  id bigint primary key,
  name text not null,
  display_name text,
  picture text,
  plan text not null default 'free',
  month_key text not null default '',
  monthly_used int not null default 0,
  bought_credits int not null default 0,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table if not exists games (
  user_id bigint not null references users(id) on delete cascade,
  universe_id bigint not null,
  place_id bigint,
  name text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, universe_id)
);
create table if not exists datasets (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  universe_id bigint,
  name text not null,
  columns jsonb not null,
  rows jsonb not null,
  uploaded_at timestamptz not null default now()
);
create index if not exists datasets_user on datasets(user_id);
create table if not exists usage (
  user_id bigint not null references users(id) on delete cascade,
  day date not null,
  chats int not null default 0,
  primary key (user_id, day)
);
create table if not exists generations (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  prompt text not null,
  style text not null,
  kind text not null,
  mime text not null,
  image bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists generations_user on generations(user_id, created_at desc);
create table if not exists ccu_snapshots (
  universe_id bigint not null,
  ts timestamptz not null default now(),
  playing int not null,
  primary key (universe_id, ts)
);
create index if not exists ccu_snapshots_ts on ccu_snapshots(ts);
create table if not exists market_cache (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
"""

_schema_ready = False


def db():
    global _schema_ready
    if not DATABASE_URL:
        raise HTTPException(503, "Database is not connected yet")
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row, autocommit=True, connect_timeout=10)
    if not _schema_ready:
        conn.execute(SCHEMA)
        _schema_ready = True
    return conn


# ---------------------------------------------------------------- signed tokens

def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign(payload: dict) -> str:
    if not SESSION_SECRET:
        raise HTTPException(503, "SESSION_SECRET is not set")
    body = _b64e(json.dumps(payload, separators=(",", ":")).encode())
    mac = _b64e(hmac.new(SESSION_SECRET.encode(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{mac}"


def unsign(token: str) -> dict | None:
    try:
        body, mac = token.split(".", 1)
        good = _b64e(hmac.new(SESSION_SECRET.encode(), body.encode(), hashlib.sha256).digest())
        if not SESSION_SECRET or not hmac.compare_digest(mac, good):
            return None
        data = json.loads(_b64d(body))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


def current_user(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    token = auth[7:] if auth.lower().startswith("bearer ") else request.query_params.get("t", "")
    data = unsign(token) if token else None
    if not data or data.get("typ") != "session":
        raise HTTPException(401, "Sign in required")
    with db() as conn:
        user = conn.execute("select * from users where id = %s", (data["uid"],)).fetchone()
    if not user:
        raise HTTPException(401, "Account not found, sign in again")
    return user


def is_pro(user: dict) -> bool:
    return user["plan"] == "pro" or user["id"] in OWNER_IDS


def month_key() -> str:
    return dt.datetime.utcnow().strftime("%Y-%m")


def credits_info(user: dict) -> dict:
    used = user["monthly_used"] if user["month_key"] == month_key() else 0
    monthly_left = max(0, PRO_MONTHLY_CREDITS - used) if is_pro(user) else 0
    return {
        "monthly_left": monthly_left,
        "monthly_total": PRO_MONTHLY_CREDITS if is_pro(user) else 0,
        "bought": user["bought_credits"],
        "total": monthly_left + user["bought_credits"],
        "resets": (dt.date.today().replace(day=1) + dt.timedelta(days=32)).replace(day=1).isoformat(),
    }


def require_pro(user: dict = Depends(current_user)) -> dict:
    if not is_pro(user):
        raise HTTPException(402, "AI tools are part of the Pro plan")
    return user


# ---------------------------------------------------------------- health

@app.get("/api/health")
async def health():
    db_ok = False
    if DATABASE_URL:
        try:
            with db() as conn:
                conn.execute("select 1")
            db_ok = True
        except Exception:
            db_ok = False
    return {
        "ok": True,
        "database": db_ok,
        "roblox_login": bool(ROBLOX_CLIENT_ID and ROBLOX_CLIENT_SECRET),
        "session_secret": bool(SESSION_SECRET),
        "owners": len(OWNER_IDS),
        "gemini": bool(GOOGLE_API_KEY),
        "chat_model": GEMINI_CHAT_MODEL,
        "image_model": GEMINI_IMAGE_MODEL,
    }


# ---------------------------------------------------------------- Roblox sign in

ROBLOX_AUTHORIZE = "https://apis.roblox.com/oauth/v1/authorize"
ROBLOX_TOKEN = "https://apis.roblox.com/oauth/v1/token"
ROBLOX_USERINFO = "https://apis.roblox.com/oauth/v1/userinfo"
ROBLOX_SCOPES = os.environ.get("ROBLOX_SCOPES", "openid profile")
REDIRECT_URI = f"{PUBLIC_API_URL}/api/auth/callback"


def _allowed_return(url: str) -> bool:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}".rstrip("/") in ALLOWED_RETURN_ORIGINS


@app.get("/api/auth/login")
async def auth_login(return_to: str):
    if not (ROBLOX_CLIENT_ID and ROBLOX_CLIENT_SECRET):
        raise HTTPException(503, "Roblox sign in is not configured yet")
    if not _allowed_return(return_to):
        raise HTTPException(400, "return_to is not an allowed site")
    state = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(48)
    challenge = _b64e(hashlib.sha256(verifier.encode()).digest())
    query = urlencode({
        "client_id": ROBLOX_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "scope": ROBLOX_SCOPES,
        "response_type": "code",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    })
    resp = RedirectResponse(f"{ROBLOX_AUTHORIZE}?{query}", status_code=302)
    cookie = sign({"typ": "oauth", "state": state, "v": verifier, "r": return_to, "exp": time.time() + 600})
    resp.set_cookie("rs_oauth", cookie, max_age=600, httponly=True, secure=True, samesite="lax", path="/api/auth")
    return resp


@app.get("/api/auth/callback")
async def auth_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    data = unsign(request.cookies.get("rs_oauth", ""))
    if not data or data.get("typ") != "oauth":
        raise HTTPException(400, "Sign in expired, try again")
    back = data["r"]
    if error or not code or state != data["state"]:
        why = error or ("no_code" if not code else "state_mismatch")
        desc = request.query_params.get("error_description", "")
        msg = f"{why}: {desc}" if desc else why
        return RedirectResponse(f"{back}#/auth/callback?" + urlencode({"error": msg}), status_code=302)
    async with httpx.AsyncClient(timeout=20) as c:
        tok = await c.post(ROBLOX_TOKEN, data={
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": data["v"],
            "client_id": ROBLOX_CLIENT_ID,
            "client_secret": ROBLOX_CLIENT_SECRET,
            "redirect_uri": REDIRECT_URI,
        })
        if tok.status_code != 200:
            return RedirectResponse(f"{back}#/auth/callback?error=token", status_code=302)
        info = await c.get(ROBLOX_USERINFO, headers={"authorization": f"Bearer {tok.json()['access_token']}"})
        if info.status_code != 200:
            return RedirectResponse(f"{back}#/auth/callback?error=profile", status_code=302)
        u = info.json()
        uid = int(u["sub"])
        # With only the openid scope Roblox returns just the ID, so fill the rest from public APIs.
        if not u.get("preferred_username"):
            try:
                pub = (await c.get(f"https://users.roblox.com/v1/users/{uid}")).json()
                u["preferred_username"] = pub.get("name")
                u["nickname"] = pub.get("displayName")
            except Exception:
                pass
        if not u.get("picture"):
            try:
                th = (await c.get("https://thumbnails.roblox.com/v1/users/avatar-headshot",
                                  params={"userIds": uid, "size": "150x150", "format": "Png"})).json()
                u["picture"] = (th.get("data") or [{}])[0].get("imageUrl")
            except Exception:
                pass
    with db() as conn:
        conn.execute(
            """insert into users (id, name, display_name, picture) values (%s, %s, %s, %s)
               on conflict (id) do update set name = excluded.name, display_name = excluded.display_name,
               picture = excluded.picture, last_seen = now()""",
            (uid, u.get("preferred_username") or u.get("name") or str(uid), u.get("nickname") or u.get("name"), u.get("picture")),
        )
    session = sign({"typ": "session", "uid": uid, "exp": time.time() + SESSION_DAYS * 86400})
    resp = RedirectResponse(f"{back}#/auth/callback?token={session}", status_code=302)
    resp.delete_cookie("rs_oauth", path="/api/auth")
    return resp


# ---------------------------------------------------------------- account

def _games(conn, uid: int) -> list[dict]:
    return conn.execute(
        "select universe_id, place_id, name, added_at from games where user_id = %s order by added_at", (uid,)
    ).fetchall()


@app.get("/api/me")
async def me(user: dict = Depends(current_user)):
    with db() as conn:
        games = _games(conn, user["id"])
        used = conn.execute(
            "select chats from usage where user_id = %s and day = current_date", (user["id"],)
        ).fetchone()
    return {
        "id": str(user["id"]),
        "name": user["name"],
        "display_name": user["display_name"],
        "picture": user["picture"],
        "plan": "pro" if is_pro(user) else "free",
        "credits": credits_info(user),
        "chats_today": used["chats"] if used else 0,
        "chats_per_day": PRO_DAILY_CHATS if is_pro(user) else 0,
        "game_limit": None if is_pro(user) else FREE_GAMES,
        "games": [{**g, "universe_id": str(g["universe_id"]), "place_id": str(g["place_id"] or "")} for g in games],
    }


@app.delete("/api/me")
async def delete_me(user: dict = Depends(current_user)):
    with db() as conn:
        conn.execute("delete from users where id = %s", (user["id"],))
    return {"deleted": True}


# ---------------------------------------------------------------- games

class GameIn(BaseModel):
    input: str = Field(min_length=1, max_length=300)


async def _resolve_game(c: httpx.AsyncClient, text: str) -> tuple[int, int | None]:
    """Accepts a game URL, a place ID or a universe ID. Returns (universe_id, place_id)."""
    m = re.search(r"/games/(\d+)", text)
    num = int(m.group(1)) if m else int(re.sub(r"\D", "", text) or 0)
    if not num:
        raise HTTPException(400, "Paste a game link or ID")
    r = await c.get(f"https://apis.roblox.com/universes/v1/places/{num}/universe")
    if r.status_code == 200 and r.json().get("universeId"):
        return int(r.json()["universeId"]), num
    return num, None  # maybe it already is a universe ID


async def _game_details(c: httpx.AsyncClient, ids: list[int]) -> dict[int, dict]:
    if not ids:
        return {}
    joined = ",".join(map(str, ids[:100]))
    games = await c.get("https://games.roblox.com/v1/games", params={"universeIds": joined})
    votes = await c.get("https://games.roblox.com/v1/games/votes", params={"universeIds": joined})
    icons = await c.get(
        "https://thumbnails.roblox.com/v1/games/icons",
        params={"universeIds": joined, "size": "150x150", "format": "Png", "isCircular": "false"},
    )
    out: dict[int, dict] = {}
    for g in games.json().get("data", []) if games.status_code == 200 else []:
        out[g["id"]] = {
            "universe_id": str(g["id"]),
            "place_id": str(g.get("rootPlaceId") or ""),
            "name": g["name"],
            "playing": g.get("playing", 0),
            "visits": g.get("visits", 0),
            "favorites": g.get("favoritedCount", 0),
            "genre": g.get("genre"),
            "updated": g.get("updated"),
            "created": g.get("created"),
            "max_players": g.get("maxPlayers"),
            "description": (g.get("description") or "")[:600],
            "creator": (g.get("creator") or {}).get("name"),
        }
    for v in votes.json().get("data", []) if votes.status_code == 200 else []:
        if v["id"] in out:
            up, down = v.get("upVotes", 0), v.get("downVotes", 0)
            out[v["id"]].update(likes=up, dislikes=down, rating=round(100 * up / (up + down)) if up + down else None)
    for i in icons.json().get("data", []) if icons.status_code == 200 else []:
        if i.get("targetId") in out:
            out[i["targetId"]]["icon"] = i.get("imageUrl")
    return out


@app.post("/api/games")
async def add_game(body: GameIn, user: dict = Depends(current_user)):
    async with httpx.AsyncClient(timeout=15) as c:
        universe_id, place_id = await _resolve_game(c, body.input)
        details = (await _game_details(c, [universe_id])).get(universe_id)
    if not details:
        raise HTTPException(404, "Could not find that game on Roblox")
    with db() as conn:
        count = conn.execute("select count(*) as n from games where user_id = %s", (user["id"],)).fetchone()["n"]
        exists = conn.execute(
            "select 1 from games where user_id = %s and universe_id = %s", (user["id"], universe_id)
        ).fetchone()
        if not exists and not is_pro(user) and count >= FREE_GAMES:
            raise HTTPException(402, "The Free plan includes 1 game. Upgrade to Pro for more.")
        conn.execute(
            """insert into games (user_id, universe_id, place_id, name) values (%s, %s, %s, %s)
               on conflict (user_id, universe_id) do update set name = excluded.name""",
            (user["id"], universe_id, place_id or int(details["place_id"] or 0) or None, details["name"]),
        )
    return details


@app.delete("/api/games/{universe_id}")
async def remove_game(universe_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        conn.execute("delete from games where user_id = %s and universe_id = %s", (user["id"], universe_id))
        conn.execute("delete from datasets where user_id = %s and universe_id = %s", (user["id"], universe_id))
    return {"deleted": True}


@app.get("/api/games/stats")
async def games_stats(user: dict = Depends(current_user)):
    with db() as conn:
        ids = [g["universe_id"] for g in _games(conn, user["id"])]
    async with httpx.AsyncClient(timeout=15) as c:
        details = await _game_details(c, ids)
    return {"data": [details[i] for i in ids if i in details]}


# ---------------------------------------------------------------- datasets (CSV exports from Creator Dashboard)

class DatasetIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    universe_id: str | None = None
    columns: list[str] = Field(min_length=1, max_length=40)
    rows: list[list[str | float | int | None]] = Field(max_length=5000)


@app.post("/api/datasets")
async def add_dataset(body: DatasetIn, user: dict = Depends(current_user)):
    if len(json.dumps(body.rows)) > 1_500_000:
        raise HTTPException(413, "File is too large (max about 1.5 MB)")
    rows = body.rows if is_pro(user) else body.rows[-7:]  # Free plan keeps the last 7 rows (days)
    with db() as conn:
        row = conn.execute(
            """insert into datasets (user_id, universe_id, name, columns, rows) values (%s, %s, %s, %s, %s)
               returning id, uploaded_at""",
            (user["id"], int(body.universe_id) if body.universe_id else None, body.name, Jsonb(body.columns), Jsonb(rows)),
        ).fetchone()
    return {"id": row["id"], "uploaded_at": row["uploaded_at"], "rows_saved": len(rows), "trimmed": len(rows) < len(body.rows)}


@app.get("/api/datasets")
async def list_datasets(universe_id: str | None = None, user: dict = Depends(current_user)):
    q = "select id, universe_id, name, columns, rows, uploaded_at from datasets where user_id = %s"
    args: list = [user["id"]]
    if universe_id:
        q += " and (universe_id = %s or universe_id is null)"
        args.append(int(universe_id))
    with db() as conn:
        rows = conn.execute(q + " order by uploaded_at desc", args).fetchall()
    return {"data": [{**r, "universe_id": str(r["universe_id"]) if r["universe_id"] else None} for r in rows]}


@app.delete("/api/datasets/{dataset_id}")
async def delete_dataset(dataset_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        conn.execute("delete from datasets where id = %s and user_id = %s", (dataset_id, user["id"]))
    return {"deleted": True}


def _dataset_summary(rows: list[dict], max_rows: int = 30) -> str:
    parts = []
    for d in rows[:8]:
        cols = d["columns"]
        body = d["rows"][-max_rows:]
        lines = [",".join(map(str, cols))] + [",".join("" if v is None else str(v) for v in r) for r in body]
        parts.append(f"Dataset '{d['name']}' (last {len(body)} rows):\n" + "\n".join(lines))
    return "\n\n".join(parts)


# ---------------------------------------------------------------- Gemini text

_UNSET = object()
_THINKING_OPTIONS = [{"thinkingLevel": "minimal"}, {"thinkingLevel": "low"}, {"thinkingBudget": 0}, None]
_THINKING_OK = _UNSET  # remembered per warm instance once a setting works

SYSTEM_PROMPT = (
    "You are the RoStats assistant for Roblox game developers. Answer briefly and concretely in plain "
    "language, without markdown headers and without em dashes. When the developer's Creator Dashboard data "
    "is included, base every claim on it and quote the numbers you use. If the data needed is missing, say "
    "which Creator Dashboard chart to export instead of guessing numbers."
)


async def gemini_text(contents: list[dict], system: str, max_tokens: int = CHAT_MAX_TOKENS, json_mode: bool = False) -> str:
    global _THINKING_OK
    if not GOOGLE_API_KEY:
        raise HTTPException(503, "Gemini key is not configured")
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": contents,
        "generationConfig": {"maxOutputTokens": max_tokens},
    }
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_CHAT_MODEL}:generateContent"
    options = [_THINKING_OK] if _THINKING_OK is not _UNSET else _THINKING_OPTIONS
    async with httpx.AsyncClient(timeout=55) as c:
        for opt in options:
            if opt is None:
                body["generationConfig"].pop("thinkingConfig", None)
            else:
                body["generationConfig"]["thinkingConfig"] = opt
            r = await c.post(url, params={"key": GOOGLE_API_KEY}, json=body)
            if r.status_code != 400:
                if r.status_code == 200:
                    _THINKING_OK = opt
                break
    if r.status_code in (429, 503):
        raise HTTPException(503, "The AI model is busy right now. Try again in a minute.")
    if r.status_code != 200:
        raise HTTPException(502, f"AI error {r.status_code}")
    data = r.json()
    return "".join(
        p.get("text", "") for cand in data.get("candidates", [])[:1] for p in cand.get("content", {}).get("parts", [])
    ).strip()


def _use_chat(conn, user: dict) -> None:
    row = conn.execute(
        """insert into usage (user_id, day, chats) values (%s, current_date, 1)
           on conflict (user_id, day) do update set chats = usage.chats + 1
           where usage.chats < %s returning chats""",
        (user["id"], PRO_DAILY_CHATS),
    ).fetchone()
    if not row:
        raise HTTPException(429, f"Daily limit of {PRO_DAILY_CHATS} AI messages reached. It resets at midnight UTC.")


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    universe_id: str | None = None
    include_data: bool = True
    notes: str | None = Field(default=None, max_length=6000)


@app.post("/api/chat")
async def chat(body: ChatIn, user: dict = Depends(require_pro)):
    system = SYSTEM_PROMPT
    with db() as conn:
        _use_chat(conn, user)
        if body.include_data:
            q = "select name, columns, rows from datasets where user_id = %s"
            args: list = [user["id"]]
            if body.universe_id:
                q += " and (universe_id = %s or universe_id is null)"
                args.append(int(body.universe_id))
            ds = conn.execute(q + " order by uploaded_at desc limit 8", args).fetchall()
            if ds:
                system += "\n\nThe developer's Creator Dashboard data:\n" + _dataset_summary(ds)
    if body.notes:
        system += "\n\nNotes from the developer:\n" + body.notes
    contents = [{"role": "user" if m.role == "user" else "model", "parts": [{"text": m.content}]} for m in body.messages]
    return {"reply": await gemini_text(contents, system)}


class InsightsIn(BaseModel):
    universe_id: str | None = None
    focus: Literal["overview", "players", "monetization"] = "overview"
    dataset_ids: list[int] = Field(default_factory=list, max_length=10)


FOCUS = {
    "overview": "overall health of the game",
    "players": "player growth, retention and engagement",
    "monetization": "revenue, paying users and what to sell",
}


@app.post("/api/insights")
async def insights(body: InsightsIn, user: dict = Depends(require_pro)):
    with db() as conn:
        q = "select name, columns, rows from datasets where user_id = %s"
        args: list = [user["id"]]
        if body.dataset_ids:
            q += " and id = any(%s)"
            args.append(body.dataset_ids)
        elif body.universe_id:
            q += " and (universe_id = %s or universe_id is null)"
            args.append(int(body.universe_id))
        ds = conn.execute(q + " order by uploaded_at desc limit 8", args).fetchall()
        if not ds:
            raise HTTPException(400, "Upload a Creator Dashboard export first")
        _use_chat(conn, user)
    prompt = (
        f"Analyze this data with a focus on {FOCUS[body.focus]}. Give 3 to 5 short findings, each with the "
        "number it is based on, then the single most useful next action. Plain text, one finding per line."
    )
    system = SYSTEM_PROMPT + "\n\nData:\n" + _dataset_summary(ds, max_rows=60)
    return {"text": await gemini_text([{"role": "user", "parts": [{"text": prompt}]}], system, max_tokens=500)}


# ---------------------------------------------------------------- Art generator

class ArtIn(BaseModel):
    changes: str = Field(min_length=1, max_length=1500)
    style: Literal["Cartoon", "Anime"] = "Cartoon"
    kind: Literal["Thumbnail", "Icon", "Vector"] = "Thumbnail"
    images: list[str] = Field(default_factory=list, max_length=4)


KIND_HINTS = {
    "Thumbnail": "a 16:9 Roblox game thumbnail, eye-catching, readable at small size, main subject centered",
    "Icon": "a square 1:1 Roblox game icon, one clear focal subject, bold shapes, minimal background",
    "Vector": "a flat vector logo or badge on a plain background, clean edges, limited palette, no photo textures",
}
STYLE_HINTS = {
    "Cartoon": "bright cartoon style like popular Roblox games, thick outlines, saturated colors",
    "Anime": "anime style, expressive characters, dynamic lighting, clean linework",
}


def _split_data_url(s: str) -> tuple[str, str]:
    if s.startswith("data:"):
        head, b64 = s.split(",", 1)
        return head[5:].split(";")[0] or "image/png", b64
    return "image/png", s


def _spend_credit(conn, user: dict) -> None:
    mk = month_key()
    # Monthly Pro credits first, then bought credits.
    row = conn.execute(
        """update users set
             monthly_used = case when month_key = %(mk)s then monthly_used + 1 else 1 end,
             month_key = %(mk)s
           where id = %(id)s and %(pro)s and (case when month_key = %(mk)s then monthly_used else 0 end) < %(cap)s
           returning id""",
        {"mk": mk, "id": user["id"], "cap": PRO_MONTHLY_CREDITS, "pro": is_pro(user)},
    ).fetchone()
    if row:
        return
    row = conn.execute(
        "update users set bought_credits = bought_credits - 1 where id = %s and bought_credits > 0 returning id",
        (user["id"],),
    ).fetchone()
    if not row:
        raise HTTPException(402, "No credits left this month")


@app.post("/api/art")
async def art(body: ArtIn, user: dict = Depends(require_pro)):
    if credits_info(user)["total"] <= 0:
        raise HTTPException(402, "No credits left this month")
    if sum(len(i) for i in body.images) > 3_500_000:
        raise HTTPException(413, "Reference images are too large")
    prompt = (
        f"Create {KIND_HINTS[body.kind]} in {STYLE_HINTS[body.style]}. "
        + ("Use the attached reference image(s) as the base and apply these changes: " if body.images else "")
        + body.changes
        + ". No text, letters or watermarks in the image."
    )
    parts: list[dict] = [{"text": prompt}]
    for img in body.images:
        mime, b64 = _split_data_url(img)
        parts.append({"inline_data": {"mime_type": mime, "data": b64}})
    req = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "16:9" if body.kind == "Thumbnail" else "1:1"},
        },
    }
    models = [m.strip() for m in (GEMINI_IMAGE_MODEL + "," + os.environ.get("GEMINI_IMAGE_FALLBACKS", "")).split(",") if m.strip()]
    r = None
    async with httpx.AsyncClient(timeout=55) as c:
        for m in dict.fromkeys(models):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
            r = await c.post(url, params={"key": GOOGLE_API_KEY}, json=req)
            if r.status_code not in (404, 429, 503):
                break
    if r.status_code != 200:
        try:
            gmsg = r.json().get("error", {}).get("message", "")
        except Exception:
            gmsg = ""
        if r.status_code == 429 and ("limit: 0" in gmsg or "quota" in gmsg.lower()):
            raise HTTPException(503, "Image generation quota is used up or not enabled on the Google API key. No credit was used.")
        if r.status_code in (429, 503):
            raise HTTPException(503, "The image model is busy right now. Try again in a minute. No credit was used.")
        raise HTTPException(502, f"Image model error {r.status_code}: {gmsg[:200]} No credit was used.")
    image = None
    for cand in r.json().get("candidates", []):
        for p in cand.get("content", {}).get("parts", []):
            inline = p.get("inlineData") or p.get("inline_data")
            if inline:
                image = (inline.get("mimeType") or inline.get("mime_type") or "image/png", inline["data"])
                break
    if not image:
        raise HTTPException(502, "The model returned no image. Try rewording. No credit was used.")
    with db() as conn:
        _spend_credit(conn, user)
        row = conn.execute(
            """insert into generations (user_id, prompt, style, kind, mime, image) values (%s, %s, %s, %s, %s, %s)
               returning id, created_at""",
            (user["id"], body.changes, body.style, body.kind, image[0], base64.b64decode(image[1])),
        ).fetchone()
        conn.execute(
            """delete from generations where user_id = %s and id not in
               (select id from generations where user_id = %s order by created_at desc limit %s)""",
            (user["id"], user["id"], HISTORY_KEEP),
        )
        fresh = conn.execute("select * from users where id = %s", (user["id"],)).fetchone()
    return {"id": row["id"], "image": f"data:{image[0]};base64,{image[1]}", "credits": credits_info(fresh)}


@app.get("/api/art/history")
async def art_history(user: dict = Depends(current_user)):
    with db() as conn:
        rows = conn.execute(
            "select id, prompt, style, kind, created_at from generations where user_id = %s order by created_at desc",
            (user["id"],),
        ).fetchall()
    return {"data": rows}


@app.get("/api/art/image/{gen_id}")
async def art_image(gen_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        row = conn.execute(
            "select mime, image from generations where id = %s and user_id = %s", (gen_id, user["id"])
        ).fetchone()
    if not row:
        raise HTTPException(404, "Not found")
    return Response(bytes(row["image"]), media_type=row["mime"], headers={"cache-control": "private, max-age=86400"})


# ---------------------------------------------------------------- public Roblox data

_cache: dict[str, tuple[float, object]] = {}


def _cached(key: str, ttl: int):
    hit = _cache.get(key)
    return hit[1] if hit and hit[0] > time.time() - ttl else None


async def _explore_sorts(c: httpx.AsyncClient) -> list[dict]:
    """Roblox home page sorts (Trending, Up-and-Coming, Top Earning...)."""
    hit = _cached("sorts", 600)
    if hit is not None:
        return hit  # type: ignore[return-value]
    sorts: list[dict] = []
    token = ""
    session = str(uuid.uuid4())
    for _ in range(3):
        params = {"sessionId": session, "device": "computer", "country": "all"}
        if token:
            params["sortsPageToken"] = token
        r = await c.get("https://apis.roblox.com/explore-api/v1/get-sorts", params=params)
        if r.status_code != 200:
            break
        data = r.json()
        for s in data.get("sorts", []):
            games = s.get("games") or []
            if not games:
                continue
            sorts.append({
                "id": s.get("sortId") or s.get("topicId") or s.get("topic"),
                "title": s.get("topic") or s.get("sortDisplayName") or s.get("sortId"),
                "games": [
                    {
                        "universe_id": str(g.get("universeId")),
                        "place_id": str(g.get("rootPlaceId") or ""),
                        "name": g.get("name"),
                        "playing": g.get("playerCount", 0),
                        "likes": g.get("totalUpVotes", 0),
                        "dislikes": g.get("totalDownVotes", 0),
                    }
                    for g in games
                    if g.get("universeId")
                ],
            })
        token = data.get("nextSortsPageToken") or ""
        if not token:
            break
    if sorts:
        _cache["sorts"] = (time.time(), sorts)
    return sorts


async def _thumbs(c: httpx.AsyncClient, ids: list[str], kind: str) -> dict[str, str]:
    if not ids:
        return {}
    joined = ",".join(ids[:100])
    if kind == "icon":
        r = await c.get(
            "https://thumbnails.roblox.com/v1/games/icons",
            params={"universeIds": joined, "size": "256x256", "format": "Png", "isCircular": "false"},
        )
        return {str(d["targetId"]): d.get("imageUrl") for d in r.json().get("data", [])} if r.status_code == 200 else {}
    r = await c.get(
        "https://thumbnails.roblox.com/v1/games/multiget/thumbnails",
        params={"universeIds": joined, "countPerUniverse": 1, "size": "768x432", "format": "Png", "isCircular": "false"},
    )
    out = {}
    for d in r.json().get("data", []) if r.status_code == 200 else []:
        t = (d.get("thumbnails") or [{}])[0]
        out[str(d.get("universeId"))] = t.get("imageUrl")
    return out


@app.get("/api/market")
async def market():
    async with httpx.AsyncClient(timeout=20) as c:
        sorts = await _explore_sorts(c)
        ids = list({g["universe_id"] for s in sorts[:8] for g in s["games"][:12]})
        icons = await _thumbs(c, ids, "icon")
    out = []
    for s in sorts[:8]:
        games = []
        for g in s["games"][:12]:
            total = g["likes"] + g["dislikes"]
            games.append({**g, "icon": icons.get(g["universe_id"]), "rating": round(100 * g["likes"] / total) if total else None})
        out.append({**s, "games": games})
    return {"sorts": out, "updated": int(time.time())}


# ---------------------------------------------------------------- market intelligence
# CCU snapshots are stored every ~15 min (a GitHub Actions cron pings /api/market/snapshot),
# which lets us find games whose player count is climbing fast.

CATEGORIES: list[dict] = [
    {"name": "+1", "queries": ["1 speed", "every second"], "match": r"\+\s?1\b"},
    {"name": "Brainrot", "queries": ["brainrot"], "match": r"brainrot"},
    {"name": "Tsunami", "queries": ["tsunami"], "match": r"tsunami"},
    {"name": "Steal a", "queries": ["steal a"], "match": r"steal"},
    {"name": "Obby", "queries": ["obby"], "match": r"obby|parkour"},
    {"name": "Tycoon", "queries": ["tycoon"], "match": r"tycoon"},
    {"name": "Simulator", "queries": ["simulator"], "match": r"simulator"},
    {"name": "Tower Defense", "queries": ["tower defense"], "match": r"tower defen[cs]e|\btd\b"},
    {"name": "RNG", "queries": ["rng"], "match": r"\brng\b|luck|aura"},
    {"name": "Horror", "queries": ["horror"], "match": None},
    {"name": "Anime", "queries": ["anime"], "match": None},
    {"name": "Grow a", "queries": ["grow a garden", "grow a"], "match": r"grow"},
]
MIN_TRACK = 50  # only snapshot games with at least this many players


def _kv_get(conn, key: str, max_age: int | None = None):
    row = conn.execute("select value, updated_at from market_cache where key = %s", (key,)).fetchone()
    if not row:
        return None
    if max_age is not None and (dt.datetime.now(dt.timezone.utc) - row["updated_at"]).total_seconds() > max_age:
        return None
    return row["value"]


def _kv_set(conn, key: str, value) -> None:
    conn.execute(
        """insert into market_cache (key, value, updated_at) values (%s, %s, now())
           on conflict (key) do update set value = excluded.value, updated_at = now()""",
        (key, Jsonb(value)),
    )


async def _omni_search(c: httpx.AsyncClient, query: str, pages: int = 3) -> list[dict]:
    found: dict[str, dict] = {}
    token = ""
    session = str(uuid.uuid4())
    for _ in range(pages):
        params = {"searchQuery": query, "sessionId": session, "pageType": "all"}
        if token:
            params["pageToken"] = token
        r = await c.get("https://apis.roblox.com/search-api/omni-search", params=params)
        if r.status_code == 429:
            await asyncio.sleep(2)
            r = await c.get("https://apis.roblox.com/search-api/omni-search", params=params)
        if r.status_code == 429:
            if found:
                break
            raise HTTPException(503, "Roblox is limiting searches right now. Try again in a minute.")
        if r.status_code != 200:
            break
        data = r.json()
        items: list[dict] = []
        for res in data.get("searchResults") or []:
            if isinstance(res.get("contents"), list):
                items.extend(res["contents"])
            else:
                items.append(res)
        for g in items:
            uid = g.get("universeId")
            if not uid or (g.get("contentType") not in (None, "Game")):
                continue
            if g.get("isSponsored"):
                continue
            up, down = g.get("totalUpVotes", 0) or 0, g.get("totalDownVotes", 0) or 0
            found[str(uid)] = {
                "universe_id": str(uid),
                "place_id": str(g.get("rootPlaceId") or ""),
                "name": g.get("name") or "",
                "playing": g.get("playerCount", 0) or 0,
                "rating": round(100 * up / (up + down)) if up + down else None,
            }
        token = data.get("nextPageToken") or ""
        if not token:
            break
    return list(found.values())


async def _category(c: httpx.AsyncClient, conn, cat: dict, refresh: bool = False) -> dict:
    key = "cat:" + cat["name"].lower()
    if not refresh:
        hit = _kv_get(conn, key, 900)
        if hit:
            return hit
    games: dict[str, dict] = {}
    try:
        for q in cat["queries"]:
            for g in await _omni_search(c, q, pages=3 if len(cat["queries"]) == 1 else 2):
                games.setdefault(g["universe_id"], g)
    except HTTPException:
        stale = _kv_get(conn, key)
        if stale:
            return stale
        raise
    rows = list(games.values())
    if cat.get("match"):
        rx = re.compile(cat["match"], re.I)
        matched = [g for g in rows if rx.search(g["name"])]
        rows = matched or rows
    rows.sort(key=lambda g: g["playing"], reverse=True)
    rows = rows[:30]
    icons = await _thumbs(c, [g["universe_id"] for g in rows], "icon")
    for g in rows:
        g["icon"] = icons.get(g["universe_id"])
    value = {"name": cat["name"], "games": rows, "updated": int(time.time())}
    if rows:
        _kv_set(conn, key, value)
    return value


def _store_snapshot(conn, games: list[dict]) -> int:
    seen: dict[int, int] = {}
    for g in games:
        try:
            uid = int(g["universe_id"])
        except (KeyError, TypeError, ValueError):
            continue
        if (g.get("playing") or 0) >= MIN_TRACK:
            seen[uid] = max(seen.get(uid, 0), int(g["playing"]))
    if not seen:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            "insert into ccu_snapshots (universe_id, playing) values (%s, %s) on conflict do nothing",
            list(seen.items()),
        )
    conn.execute("delete from ccu_snapshots where ts < now() - interval '4 days'")
    return len(seen)


async def _take_snapshot(force: bool = False) -> dict:
    with db() as conn:
        last = conn.execute("select max(ts) as t from ccu_snapshots").fetchone()["t"]
        if not force and last and (dt.datetime.now(dt.timezone.utc) - last).total_seconds() < 600:
            return {"skipped": True, "last": last.isoformat()}
        async with httpx.AsyncClient(timeout=25) as c:
            sorts = await _explore_sorts(c)
            games = [g for s in sorts for g in s["games"]]
            # refresh two categories per run, round robin, so every list stays fresh
            slot = int(time.time() // 900)
            for i in range(2):
                cat = CATEGORIES[(slot * 2 + i) % len(CATEGORIES)]
                try:
                    games += (await _category(c, conn, cat, refresh=True))["games"]
                except HTTPException:
                    pass
            for cat in CATEGORIES:
                hit = _kv_get(conn, "cat:" + cat["name"].lower(), 3600)
                if hit:
                    games += hit["games"]
        n = _store_snapshot(conn, games)
    return {"stored": n}


def _growth(conn, ids: list[int] | None = None) -> dict[int, dict]:
    """Current CCU vs about 24h ago (or the oldest snapshot at least 2h old)."""
    rows = conn.execute(
        """
        with latest as (
          select distinct on (universe_id) universe_id, playing, ts from ccu_snapshots
          where ts > now() - interval '90 minutes' order by universe_id, ts desc
        ), past as (
          select distinct on (universe_id) universe_id, playing, ts from ccu_snapshots
          where ts < now() - interval '2 hours' and ts > now() - interval '30 hours'
          order by universe_id, abs(extract(epoch from ts - (now() - interval '24 hours')))
        ), first_seen as (
          select universe_id, min(ts) as first_ts from ccu_snapshots group by universe_id
        )
        select l.universe_id, l.playing as now_playing, p.playing as then_playing, p.ts as then_ts, f.first_ts
        from latest l left join past p using (universe_id) left join first_seen f using (universe_id)
        where (%s::bigint[] is null or l.universe_id = any(%s::bigint[]))
        """,
        (ids, ids),
    ).fetchall()
    out = {}
    now = dt.datetime.now(dt.timezone.utc)
    for r in rows:
        then = r["then_playing"]
        hours = round((now - r["then_ts"]).total_seconds() / 3600) if r["then_ts"] else None
        out[r["universe_id"]] = {
            "playing": r["now_playing"],
            "before": then,
            "hours": hours,
            "change": (r["now_playing"] - then) if then is not None else None,
            "change_pct": round(100 * (r["now_playing"] - then) / max(then, 1)) if then is not None else None,
        }
    return out


@app.post("/api/market/snapshot")
@app.get("/api/market/snapshot")
async def market_snapshot():
    return await _take_snapshot()


@app.get("/api/market/categories")
async def market_categories():
    return {"categories": [c["name"] for c in CATEGORIES]}


@app.get("/api/market/category")
async def market_category(name: str = "", q: str = ""):
    if q.strip():
        cat = {"name": q.strip()[:40], "queries": [q.strip()[:40]], "match": None}
    else:
        cat = next((c for c in CATEGORIES if c["name"].lower() == name.lower()), None)
        if not cat:
            raise HTTPException(404, "Unknown category")
    with db() as conn:
        async with httpx.AsyncClient(timeout=25) as c:
            data = await _category(c, conn, cat)
        growth = _growth(conn, [int(g["universe_id"]) for g in data["games"]])
    games = [{**g, "growth": growth.get(int(g["universe_id"]))} for g in data["games"]]
    return {**data, "games": games}


async def _rising_list(conn) -> dict:
    hit = _kv_get(conn, "rising", 600)
    if hit:
        return hit
    growth = _growth(conn)
    history = conn.execute(
        "select extract(epoch from now() - min(ts)) / 3600 as h from ccu_snapshots"
    ).fetchone()["h"] or 0
    history = float(history)
    scored = []
    for uid, g in growth.items():
        if g["before"] is None or g["playing"] < 300:
            continue
        gain = g["change"]
        if gain <= 0:
            continue
        # reward big relative jumps but keep tiny games from dominating
        score = gain / (g["before"] + 300)
        if g["change_pct"] >= 15 or gain >= 3000:
            scored.append((score, uid))
    scored.sort(reverse=True)
    ids = [uid for _, uid in scored[:24]]
    mode = "growth"
    async with httpx.AsyncClient(timeout=25) as c:
        if len(ids) < 6:
            # not enough history yet: use Roblox's own Up-and-Coming and young games from the charts
            mode = "new"
            sorts = await _explore_sorts(c)
            pool: dict[str, dict] = {}
            for s in sorts:
                for g in s["games"]:
                    pool.setdefault(g["universe_id"], g)
            up = [g for s in sorts if "up" in (s["title"] or "").lower() and "coming" in (s["title"] or "").lower() for g in s["games"]]
            ids = [int(g["universe_id"]) for g in up[:24]] or [int(u) for u in list(pool)[:40]]
        details = await _game_details(c, ids)
    now = dt.datetime.now(dt.timezone.utc)
    games = []
    for uid in ids:
        d = details.get(uid)
        if not d:
            continue
        created = d.get("created")
        age_days = None
        if created:
            try:
                age_days = (now - dt.datetime.fromisoformat(created.replace("Z", "+00:00"))).days
            except ValueError:
                pass
        games.append({**d, "age_days": age_days, "growth": growth.get(uid)})
    if mode == "new":
        young = [g for g in games if g["age_days"] is not None and g["age_days"] <= 120]
        games = sorted(young or games, key=lambda g: g["playing"], reverse=True)
    games = games[:15]
    value = {"mode": mode, "history_hours": round(history, 1), "games": games, "updated": int(time.time())}
    _kv_set(conn, "rising", value)
    return value


@app.get("/api/market/rising")
async def market_rising():
    try:
        await _take_snapshot()
    except Exception:
        pass
    with db() as conn:
        return await _rising_list(conn)


MARKET_SYSTEM = (
    "You are a Roblox market analyst helping game developers decide what to build. You get games whose "
    "player count is rising fast, with their name, description, age, player numbers and icon. For each game "
    "explain in plain words why it is likely growing (core hook and loop, theme or meme trend it rides, how it "
    "combines popular formats like +1, brainrot, tsunami, steal a, obby, simulator, how the icon and title "
    "grab clicks, how new or recently updated it is) and give 2 or 3 concrete things a developer could copy. "
    "Be specific to the game, not generic. Short sentences, no hype, no em dashes. Also write a 2 to 3 sentence "
    "summary of the overall trend across all games. Reply only with JSON: "
    '{"summary": str, "games": [{"universe_id": str, "why": str, "copy": [str]}]}'
)


@app.get("/api/market/analysis")
async def market_analysis(user: dict = Depends(current_user)):
    with db() as conn:
        cached = _kv_get(conn, "analysis", 6 * 3600)
        if cached:
            return cached
        rising = await _rising_list(conn)
    top = rising["games"][:6]
    if not top:
        return {"summary": "", "games": [], "updated": int(time.time())}
    parts: list[dict] = []
    async with httpx.AsyncClient(timeout=20) as c:
        for g in top:
            gr = g.get("growth") or {}
            info = {
                "universe_id": g["universe_id"],
                "name": g["name"],
                "creator": g.get("creator"),
                "genre": g.get("genre"),
                "age_days": g.get("age_days"),
                "last_updated": g.get("updated"),
                "playing_now": g["playing"],
                "playing_before": gr.get("before"),
                "hours_between": gr.get("hours"),
                "visits": g.get("visits"),
                "rating_pct": g.get("rating"),
                "description": g.get("description"),
            }
            parts.append({"text": json.dumps(info, ensure_ascii=False)})
            if g.get("icon"):
                try:
                    img = await c.get(g["icon"])
                    if img.status_code == 200 and len(img.content) < 400_000:
                        parts.append({"inline_data": {"mime_type": img.headers.get("content-type", "image/png").split(";")[0],
                                                       "data": base64.b64encode(img.content).decode()}})
                except httpx.HTTPError:
                    pass
    raw = await gemini_text([{"role": "user", "parts": parts}], MARKET_SYSTEM, max_tokens=1500, json_mode=True)
    try:
        data = json.loads(raw[raw.find("{"): raw.rfind("}") + 1])
    except ValueError:
        raise HTTPException(502, "The AI answer could not be read. Try again.")
    value = {
        "summary": str(data.get("summary", "")),
        "games": [
            {"universe_id": str(x.get("universe_id")), "why": str(x.get("why", "")), "copy": [str(i) for i in x.get("copy", [])][:3]}
            for x in data.get("games", []) if isinstance(x, dict)
        ],
        "updated": int(time.time()),
    }
    with db() as conn:
        _kv_set(conn, "analysis", value)
    return value


@app.get("/api/roblox/home-sample")
async def home_sample(kind: Literal["thumbnail", "icon"] = "thumbnail", count: int = 11):
    async with httpx.AsyncClient(timeout=20) as c:
        sorts = await _explore_sorts(c)
        games: list[dict] = []
        seen = set()
        for s in sorts:
            for g in s["games"]:
                if g["universe_id"] not in seen:
                    seen.add(g["universe_id"])
                    games.append(g)
        games = games[: max(4, min(count, 23))]
        images = await _thumbs(c, [g["universe_id"] for g in games], kind)
    return {"data": [{**g, "image": images.get(g["universe_id"])} for g in games if images.get(g["universe_id"])]}


@app.get("/api/roblox/games")
async def roblox_games(universeIds: str):
    ids = [int(x) for x in re.findall(r"\d+", universeIds)][:100]
    async with httpx.AsyncClient(timeout=15) as c:
        details = await _game_details(c, ids)
    return {"data": [details[i] for i in ids if i in details]}
