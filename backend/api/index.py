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
SITE_URL = os.environ.get("SITE_URL", "https://matetheakhaladze.github.io/RoStats/")
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
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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
create table if not exists teams (
  id bigserial primary key,
  name text not null,
  owner_id bigint not null references users(id) on delete cascade,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists team_members (
  team_id bigint not null references teams(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create table if not exists team_games (
  team_id bigint not null references teams(id) on delete cascade,
  universe_id bigint not null,
  added_by bigint not null references users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (team_id, universe_id)
);
create table if not exists tasks (
  id bigserial primary key,
  team_id bigint references teams(id) on delete cascade,
  owner_id bigint not null references users(id) on delete cascade,
  status text not null default 'todo',
  title text not null,
  notes text not null default '',
  assignee_id bigint references users(id) on delete set null,
  due date,
  universe_id bigint,
  position double precision not null default 0,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_team on tasks(team_id);
create index if not exists tasks_owner on tasks(owner_id);
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
async def auth_login(return_to: str = ""):
    if not (ROBLOX_CLIENT_ID and ROBLOX_CLIENT_SECRET):
        raise HTTPException(503, "Roblox sign in is not configured yet")
    if not return_to or not _allowed_return(return_to):
        return_to = SITE_URL
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
        return RedirectResponse(f"{SITE_URL}#/auth/callback?" + urlencode({"error": "Sign in expired, please try again"}), status_code=302)
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


def _shared_games(conn, uid: int) -> list[dict]:
    """Games other team members shared into teams this user belongs to."""
    return conn.execute(
        """
        select distinct on (tg.universe_id) tg.universe_id, g.place_id, g.name, tg.added_at,
               u.display_name as shared_by_display, u.name as shared_by
        from team_members tm
        join team_games tg on tg.team_id = tm.team_id
        join games g on g.user_id = tg.added_by and g.universe_id = tg.universe_id
        join users u on u.id = tg.added_by
        where tm.user_id = %s and tg.added_by <> %s
          and tg.universe_id not in (select universe_id from games where user_id = %s)
        order by tg.universe_id, tg.added_at
        """,
        (uid, uid, uid),
    ).fetchall()


def _data_owners(conn, uid: int, universe_id: int) -> list[int]:
    """Users whose uploaded data for this game the user may read: themself plus teammates sharing it."""
    rows = conn.execute(
        """
        select distinct tm2.user_id from team_members tm
        join team_games tg on tg.team_id = tm.team_id and tg.universe_id = %s
        join team_members tm2 on tm2.team_id = tg.team_id
        where tm.user_id = %s
        """,
        (universe_id, uid),
    ).fetchall()
    return sorted({uid, *[r["user_id"] for r in rows]})


def _can_view_game(conn, uid: int, universe_id: int) -> bool:
    if conn.execute("select 1 from games where user_id = %s and universe_id = %s", (uid, universe_id)).fetchone():
        return True
    return bool(conn.execute(
        """select 1 from team_members tm join team_games tg on tg.team_id = tm.team_id
           where tm.user_id = %s and tg.universe_id = %s""",
        (uid, universe_id),
    ).fetchone())


def _datasets_for(conn, uid: int, universe_id: str | int | None, limit: int | None = None):
    cols = "d.id, d.user_id, d.universe_id, d.name, d.columns, d.rows, d.uploaded_at, u.name as owner_name"
    if universe_id:
        owners = _data_owners(conn, uid, int(universe_id))
        q = (f"select {cols} from datasets d join users u on u.id = d.user_id "
             "where (d.universe_id = %s and d.user_id = any(%s)) or (d.universe_id is null and d.user_id = %s)")
        args: list = [int(universe_id), owners, uid]
    else:
        q = f"select {cols} from datasets d join users u on u.id = d.user_id where d.user_id = %s"
        args = [uid]
    q += " order by d.uploaded_at desc"
    if limit:
        q += f" limit {int(limit)}"
    return conn.execute(q, args).fetchall()


@app.get("/api/me")
async def me(user: dict = Depends(current_user)):
    with db() as conn:
        games = _games(conn, user["id"])
        shared = _shared_games(conn, user["id"])
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
        "games": [{**g, "universe_id": str(g["universe_id"]), "place_id": str(g["place_id"] or ""), "shared_by": None} for g in games]
        + [{"universe_id": str(g["universe_id"]), "place_id": str(g["place_id"] or ""), "name": g["name"], "added_at": g["added_at"],
            "shared_by": g["shared_by_display"] or g["shared_by"]} for g in shared],
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
        conn.execute("delete from team_games where added_by = %s and universe_id = %s", (user["id"], universe_id))
    return {"deleted": True}


@app.get("/api/games/stats")
async def games_stats(user: dict = Depends(current_user)):
    with db() as conn:
        ids = [g["universe_id"] for g in _games(conn, user["id"])] + [g["universe_id"] for g in _shared_games(conn, user["id"])]
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
        if body.universe_id and not _can_view_game(conn, user["id"], int(body.universe_id)):
            raise HTTPException(403, "You do not have access to this game")
        row = conn.execute(
            """insert into datasets (user_id, universe_id, name, columns, rows) values (%s, %s, %s, %s, %s)
               returning id, uploaded_at""",
            (user["id"], int(body.universe_id) if body.universe_id else None, body.name, Jsonb(body.columns), Jsonb(rows)),
        ).fetchone()
    return {"id": row["id"], "uploaded_at": row["uploaded_at"], "rows_saved": len(rows), "trimmed": len(rows) < len(body.rows)}


@app.get("/api/datasets")
async def list_datasets(universe_id: str | None = None, user: dict = Depends(current_user)):
    with db() as conn:
        rows = _datasets_for(conn, user["id"], universe_id)
    return {"data": [
        {"id": r["id"], "universe_id": str(r["universe_id"]) if r["universe_id"] else None, "name": r["name"],
         "columns": r["columns"], "rows": r["rows"], "uploaded_at": r["uploaded_at"],
         "mine": r["user_id"] == user["id"], "owner": r["owner_name"]}
        for r in rows
    ]}


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
            ds = _datasets_for(conn, user["id"], body.universe_id, limit=8)
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
        ds = _datasets_for(conn, user["id"], body.universe_id)
        if body.dataset_ids:
            ds = [d for d in ds if d["id"] in set(body.dataset_ids)]
        ds = ds[:8]
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


# ---------------------------------------------------------------- teams

MAX_TEAMS_OWNED = 5
MAX_TEAM_MEMBERS = 20


def _member(conn, team_id: int, uid: int) -> dict:
    row = conn.execute(
        """select t.id, t.name, t.owner_id, t.invite_code, m.role from teams t
           join team_members m on m.team_id = t.id and m.user_id = %s where t.id = %s""",
        (uid, team_id),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Team not found")
    return row


def _new_code() -> str:
    return secrets.token_urlsafe(9)


class TeamIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class JoinIn(BaseModel):
    code: str = Field(min_length=4, max_length=40)


class ShareGameIn(BaseModel):
    universe_id: str


@app.get("/api/teams")
async def list_teams(user: dict = Depends(current_user)):
    with db() as conn:
        teams = conn.execute(
            """select t.id, t.name, t.owner_id, t.invite_code, m.role from teams t
               join team_members m on m.team_id = t.id where m.user_id = %s order by t.created_at""",
            (user["id"],),
        ).fetchall()
        ids = [t["id"] for t in teams]
        members = conn.execute(
            """select m.team_id, u.id, u.name, u.display_name, u.picture, m.role from team_members m
               join users u on u.id = m.user_id where m.team_id = any(%s) order by m.joined_at""",
            (ids,),
        ).fetchall() if ids else []
        games = conn.execute(
            """select tg.team_id, tg.universe_id, tg.added_by, g.name, g.place_id, u.name as added_by_name
               from team_games tg join games g on g.user_id = tg.added_by and g.universe_id = tg.universe_id
               join users u on u.id = tg.added_by where tg.team_id = any(%s) order by tg.added_at""",
            (ids,),
        ).fetchall() if ids else []
    out = []
    for t in teams:
        out.append({
            "id": str(t["id"]), "name": t["name"], "owner_id": str(t["owner_id"]), "role": t["role"],
            "invite_code": t["invite_code"],
            "members": [{"id": str(m["id"]), "name": m["name"], "display_name": m["display_name"], "picture": m["picture"], "role": m["role"]}
                        for m in members if m["team_id"] == t["id"]],
            "games": [{"universe_id": str(g["universe_id"]), "place_id": str(g["place_id"] or ""), "name": g["name"],
                       "added_by": str(g["added_by"]), "added_by_name": g["added_by_name"]}
                      for g in games if g["team_id"] == t["id"]],
        })
    return {"data": out}


@app.post("/api/teams")
async def create_team(body: TeamIn, user: dict = Depends(current_user)):
    with db() as conn:
        n = conn.execute("select count(*) as n from teams where owner_id = %s", (user["id"],)).fetchone()["n"]
        if n >= MAX_TEAMS_OWNED:
            raise HTTPException(400, f"You can own up to {MAX_TEAMS_OWNED} teams")
        t = conn.execute(
            "insert into teams (name, owner_id, invite_code) values (%s, %s, %s) returning id",
            (body.name.strip(), user["id"], _new_code()),
        ).fetchone()
        conn.execute("insert into team_members (team_id, user_id, role) values (%s, %s, 'owner')", (t["id"], user["id"]))
    return {"id": str(t["id"])}


@app.post("/api/teams/join")
async def join_team(body: JoinIn, user: dict = Depends(current_user)):
    with db() as conn:
        t = conn.execute("select id, name from teams where invite_code = %s", (body.code.strip(),)).fetchone()
        if not t:
            raise HTTPException(404, "This invite link is not valid anymore. Ask for a new one.")
        n = conn.execute("select count(*) as n from team_members where team_id = %s", (t["id"],)).fetchone()["n"]
        if n >= MAX_TEAM_MEMBERS:
            raise HTTPException(400, "This team is full")
        conn.execute(
            "insert into team_members (team_id, user_id) values (%s, %s) on conflict do nothing", (t["id"], user["id"])
        )
    return {"id": str(t["id"]), "name": t["name"]}


@app.patch("/api/teams/{team_id}")
async def rename_team(team_id: int, body: TeamIn, user: dict = Depends(current_user)):
    with db() as conn:
        t = _member(conn, team_id, user["id"])
        if t["owner_id"] != user["id"]:
            raise HTTPException(403, "Only the team owner can rename it")
        conn.execute("update teams set name = %s where id = %s", (body.name.strip(), team_id))
    return {"ok": True}


@app.post("/api/teams/{team_id}/invite")
async def reset_invite(team_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        t = _member(conn, team_id, user["id"])
        if t["owner_id"] != user["id"]:
            raise HTTPException(403, "Only the team owner can reset the invite link")
        code = _new_code()
        conn.execute("update teams set invite_code = %s where id = %s", (code, team_id))
    return {"invite_code": code}


@app.delete("/api/teams/{team_id}")
async def delete_team(team_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        t = _member(conn, team_id, user["id"])
        if t["owner_id"] != user["id"]:
            raise HTTPException(403, "Only the team owner can delete it")
        conn.execute("delete from teams where id = %s", (team_id,))
    return {"deleted": True}


@app.delete("/api/teams/{team_id}/members/{member_id}")
async def remove_member(team_id: int, member_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        t = _member(conn, team_id, user["id"])
        if member_id != user["id"] and t["owner_id"] != user["id"]:
            raise HTTPException(403, "Only the team owner can remove members")
        if member_id == t["owner_id"]:
            raise HTTPException(400, "The owner cannot leave. Delete the team instead.")
        conn.execute("delete from team_members where team_id = %s and user_id = %s", (team_id, member_id))
        conn.execute("delete from team_games where team_id = %s and added_by = %s", (team_id, member_id))
        conn.execute("update tasks set assignee_id = null where team_id = %s and assignee_id = %s", (team_id, member_id))
    return {"removed": True}


@app.post("/api/teams/{team_id}/games")
async def share_game(team_id: int, body: ShareGameIn, user: dict = Depends(current_user)):
    uid = int(body.universe_id)
    with db() as conn:
        _member(conn, team_id, user["id"])
        if not conn.execute("select 1 from games where user_id = %s and universe_id = %s", (user["id"], uid)).fetchone():
            raise HTTPException(400, "You can only share games you added yourself")
        conn.execute(
            "insert into team_games (team_id, universe_id, added_by) values (%s, %s, %s) on conflict do nothing",
            (team_id, uid, user["id"]),
        )
    return {"ok": True}


@app.delete("/api/teams/{team_id}/games/{universe_id}")
async def unshare_game(team_id: int, universe_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        t = _member(conn, team_id, user["id"])
        row = conn.execute(
            "select added_by from team_games where team_id = %s and universe_id = %s", (team_id, universe_id)
        ).fetchone()
        if row and row["added_by"] != user["id"] and t["owner_id"] != user["id"]:
            raise HTTPException(403, "Only the person who shared it or the owner can remove it")
        conn.execute("delete from team_games where team_id = %s and universe_id = %s", (team_id, universe_id))
    return {"ok": True}


# ---------------------------------------------------------------- tasks (kanban)

TASK_STATUSES = ("todo", "doing", "review", "done")


class TaskIn(BaseModel):
    team_id: str | None = None
    title: str = Field(min_length=1, max_length=200)
    status: Literal["todo", "doing", "review", "done"] = "todo"
    notes: str = Field(default="", max_length=5000)
    assignee_id: str | None = None
    due: dt.date | None = None
    universe_id: str | None = None


class TaskPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    status: Literal["todo", "doing", "review", "done"] | None = None
    notes: str | None = Field(default=None, max_length=5000)
    assignee_id: str | None = None
    due: dt.date | None = None
    universe_id: str | None = None
    position: float | None = None
    clear: list[Literal["assignee_id", "due", "universe_id"]] = Field(default_factory=list)


def _task_row(r: dict) -> dict:
    return {
        "id": str(r["id"]), "team_id": str(r["team_id"]) if r["team_id"] else None, "status": r["status"],
        "title": r["title"], "notes": r["notes"], "assignee_id": str(r["assignee_id"]) if r["assignee_id"] else None,
        "due": r["due"].isoformat() if r["due"] else None, "universe_id": str(r["universe_id"]) if r["universe_id"] else None,
        "position": r["position"], "created_by": str(r["created_by"]) if r["created_by"] else None,
        "updated_at": r["updated_at"],
    }


def _board_check(conn, user_id: int, team_id: str | None) -> int | None:
    if team_id:
        _member(conn, int(team_id), user_id)
        return int(team_id)
    return None


def _task_access(conn, user_id: int, task_id: int) -> dict:
    t = conn.execute("select * from tasks where id = %s", (task_id,)).fetchone()
    if not t:
        raise HTTPException(404, "Task not found")
    if t["team_id"]:
        _member(conn, t["team_id"], user_id)
    elif t["owner_id"] != user_id:
        raise HTTPException(404, "Task not found")
    return t


def _check_assignee(conn, team_id: int | None, user_id: int, assignee: str | None) -> int | None:
    if not assignee:
        return None
    a = int(assignee)
    if team_id is None:
        if a != user_id:
            raise HTTPException(400, "Personal tasks can only be assigned to you")
        return a
    if not conn.execute("select 1 from team_members where team_id = %s and user_id = %s", (team_id, a)).fetchone():
        raise HTTPException(400, "That person is not in the team")
    return a


@app.get("/api/tasks")
async def list_tasks(team_id: str | None = None, user: dict = Depends(current_user)):
    with db() as conn:
        tid = _board_check(conn, user["id"], team_id)
        if tid:
            rows = conn.execute("select * from tasks where team_id = %s order by position, id", (tid,)).fetchall()
        else:
            rows = conn.execute(
                "select * from tasks where team_id is null and owner_id = %s order by position, id", (user["id"],)
            ).fetchall()
    return {"data": [_task_row(r) for r in rows]}


@app.post("/api/tasks")
async def create_task(body: TaskIn, user: dict = Depends(current_user)):
    with db() as conn:
        tid = _board_check(conn, user["id"], body.team_id)
        n = conn.execute(
            "select count(*) as n from tasks where " + ("team_id = %s" if tid else "team_id is null and owner_id = %s"),
            (tid or user["id"],),
        ).fetchone()["n"]
        if n >= 500:
            raise HTTPException(400, "This board is full (500 tasks). Delete some done tasks first.")
        pos = conn.execute(
            "select coalesce(max(position), 0) + 1 as p from tasks where status = %s and "
            + ("team_id = %s" if tid else "team_id is null and owner_id = %s"),
            (body.status, tid or user["id"]),
        ).fetchone()["p"]
        row = conn.execute(
            """insert into tasks (team_id, owner_id, status, title, notes, assignee_id, due, universe_id, position, created_by)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) returning *""",
            (tid, user["id"], body.status, body.title.strip(), body.notes,
             _check_assignee(conn, tid, user["id"], body.assignee_id), body.due,
             int(body.universe_id) if body.universe_id else None, pos, user["id"]),
        ).fetchone()
    return _task_row(row)


@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: int, body: TaskPatch, user: dict = Depends(current_user)):
    with db() as conn:
        t = _task_access(conn, user["id"], task_id)
        sets, args = [], []
        for field in ("title", "status", "notes", "due", "position"):
            v = getattr(body, field)
            if v is not None:
                sets.append(f"{field} = %s")
                args.append(v.strip() if field == "title" else v)
        if body.assignee_id is not None:
            sets.append("assignee_id = %s")
            args.append(_check_assignee(conn, t["team_id"], user["id"], body.assignee_id))
        if body.universe_id is not None:
            sets.append("universe_id = %s")
            args.append(int(body.universe_id))
        for field in body.clear:
            sets.append(f"{field} = null")
        if not sets:
            return _task_row(t)
        sets.append("updated_at = now()")
        row = conn.execute(f"update tasks set {', '.join(sets)} where id = %s returning *", (*args, task_id)).fetchone()
    return _task_row(row)


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, user: dict = Depends(current_user)):
    with db() as conn:
        _task_access(conn, user["id"], task_id)
        conn.execute("delete from tasks where id = %s", (task_id,))
    return {"deleted": True}


# ---------------------------------------------------------------- reports

REPORT_DATE_FORMATS = ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%b %d, %Y", "%d %b %Y", "%Y-%m-%dT%H:%M:%S")


def _parse_date(v) -> dt.date | None:
    if not isinstance(v, str):
        return None
    v = v.strip().replace("Z", "")
    for cand in (v, v[:10], v[:19]):
        for f in REPORT_DATE_FORMATS:
            try:
                return dt.datetime.strptime(cand, f).date()
            except ValueError:
                continue
    return None


def _period_rows(rows: list, days: int) -> list:
    if days <= 0 or not rows:
        return rows
    dates = [_parse_date(r[0]) if r else None for r in rows]
    if sum(d is not None for d in dates) >= len(rows) / 2:
        latest = max(d for d in dates if d)
        start = latest - dt.timedelta(days=days - 1)
        return [r for r, d in zip(rows, dates) if d and d >= start]
    return rows[-days:]


def _median(xs: list[float]) -> float | None:
    xs = sorted(x for x in xs if x is not None)
    if not xs:
        return None
    m = len(xs) // 2
    return xs[m] if len(xs) % 2 else (xs[m - 1] + xs[m]) / 2


def _percentile(xs: list[float], v: float | None) -> int | None:
    xs = [x for x in xs if x is not None]
    if v is None or not xs:
        return None
    return round(100 * sum(1 for x in xs if x <= v) / len(xs))


async def _benchmark_pool(c: httpx.AsyncClient, conn) -> list[dict]:
    hit = _kv_get(conn, "bench_pool", 3 * 3600)
    if hit:
        return hit
    sorts = await _explore_sorts(c)
    ids: list[int] = []
    for s in sorts:
        for g in s["games"]:
            u = int(g["universe_id"])
            if u not in ids:
                ids.append(u)
    details = await _game_details(c, ids[:100])
    pool = [
        {"playing": d.get("playing"), "rating": d.get("rating"), "visits": d.get("visits"), "favorites": d.get("favorites")}
        for d in details.values()
    ]
    if pool:
        _kv_set(conn, "bench_pool", pool)
    return pool


def _benchmarks(game: dict, pool: list[dict]) -> list[dict]:
    def fav_rate(g):
        return round(1000 * g["favorites"] / g["visits"], 2) if g.get("visits") and g.get("favorites") is not None else None

    def like_rate(g):
        return g.get("rating")

    metrics = [
        ("Players now", "playing", lambda g: g.get("playing"), "players"),
        ("Like ratio", "rating", like_rate, "%"),
        ("Favorites per 1K visits", "fav_rate", fav_rate, ""),
    ]
    out = []
    for label, key, fn, unit in metrics:
        values = [fn(p) for p in pool]
        v = fn(game)
        out.append({"key": key, "label": label, "value": v, "median": _median(values), "percentile": _percentile(values, v), "unit": unit})
    return out


async def _build_report(conn, owner_id: int, universe_id: int, days: int) -> dict:
    async with httpx.AsyncClient(timeout=20) as c:
        game = (await _game_details(c, [universe_id])).get(universe_id)
        try:
            pool = await _benchmark_pool(c, conn)
        except Exception:
            pool = []
    if not game:
        raise HTTPException(404, "Roblox did not return this game")
    ds = _datasets_for(conn, owner_id, universe_id)
    datasets = []
    for d in ds:
        rows = _period_rows(d["rows"], days)
        if rows:
            datasets.append({"id": d["id"], "name": d["name"], "columns": d["columns"], "rows": rows})
    return {
        "game": {k: game.get(k) for k in ("universe_id", "place_id", "name", "playing", "visits", "favorites", "rating", "genre", "created", "updated", "icon", "creator")},
        "days": days,
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "datasets": datasets,
        "benchmarks": _benchmarks(game, pool) if pool else [],
        "benchmark_pool": len(pool),
    }


@app.get("/api/report")
async def report(universe_id: int, days: int = 30, user: dict = Depends(current_user)):
    days = max(0, min(days, 365))
    with db() as conn:
        if not _can_view_game(conn, user["id"], universe_id):
            raise HTTPException(403, "You do not have access to this game")
        return await _build_report(conn, user["id"], universe_id, days)


class ShareReportIn(BaseModel):
    universe_id: str
    days: int = Field(default=30, ge=0, le=365)


@app.post("/api/report/share")
async def share_report(body: ShareReportIn, user: dict = Depends(current_user)):
    uid = int(body.universe_id)
    with db() as conn:
        if not _can_view_game(conn, user["id"], uid):
            raise HTTPException(403, "You do not have access to this game")
    exp = time.time() + 14 * 86400
    token = sign({"typ": "report", "uid": user["id"], "g": uid, "d": body.days, "exp": exp})
    return {"token": token, "expires": int(exp)}


@app.get("/api/report/public")
async def public_report(t: str):
    data = unsign(t)
    if not data or data.get("typ") != "report":
        raise HTTPException(404, "This report link has expired or is not valid")
    with db() as conn:
        if not _can_view_game(conn, data["uid"], data["g"]):
            raise HTTPException(404, "This report is no longer shared")
        rep = await _build_report(conn, data["uid"], data["g"], data["d"])
    return {**rep, "expires": int(data["exp"])}


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
    key = ("q:" if cat.get("strict") else "cat:") + cat["name"].lower()
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
        rows = matched if (matched or cat.get("strict")) else rows
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
        words = re.findall(r"[a-z0-9+]+", q.lower())[:5]
        # match every word by its stem, so "evolve" also finds "Evolution"
        stems = [re.escape(w if len(w) <= 4 else w[: max(4, len(w) - 2)]) for w in words]
        match = "".join(f"(?=.*{st})" for st in stems) if stems else None
        cat = {"name": q.strip()[:40], "queries": [q.strip()[:40]], "match": match, "strict": True}
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
