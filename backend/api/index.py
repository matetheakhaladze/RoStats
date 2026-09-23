"""RoStats API. Small FastAPI app deployed as a single Vercel function.

Endpoints:
  GET  /api/health              service status, which keys are configured
  POST /api/chat                chatbot backed by Gemini (cheapest text model, short answers)
  GET  /api/chat/ping           tiny live check of the chat model (a few tokens)
  POST /api/art                 image generation backed by Gemini, reference images + change notes
  GET  /api/roblox/games        public Roblox game stats (CCU, visits, favorites) by universe id
  GET  /api/roblox/universe     resolve a place id to its universe id
"""
import base64
import os
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")

# Cheapest options while we test. Bump later.
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
CLAUDE_MAX_TOKENS = int(os.environ.get("CLAUDE_MAX_TOKENS", "300"))
GEMINI_IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-lite-image")
GEMINI_CHAT_MODEL = os.environ.get("GEMINI_CHAT_MODEL", "gemini-3.5-flash-lite")
# "gemini" (default) or "claude"
CHAT_PROVIDER = os.environ.get("CHAT_PROVIDER", "gemini")

app = FastAPI(title="RoStats API", docs_url=None, redoc_url=None)


@app.exception_handler(httpx.HTTPError)
async def upstream_error(_, exc: httpx.HTTPError):
    from fastapi.responses import JSONResponse
    return JSONResponse({"detail": f"Upstream request failed: {exc.__class__.__name__}"}, status_code=502)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    google_ok = None
    if GOOGLE_API_KEY:
        # Listing models is free; it only checks the key works.
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                params={"key": GOOGLE_API_KEY, "pageSize": 1},
            )
            google_ok = r.status_code == 200
    return {
        "ok": True,
        "claude_key_set": bool(ANTHROPIC_API_KEY),
        "google_key_set": bool(GOOGLE_API_KEY),
        "google_key_ok": google_ok,
        "claude_model": CLAUDE_MODEL,
        "image_model": GEMINI_IMAGE_MODEL,
        "chat_provider": CHAT_PROVIDER,
        "chat_model": GEMINI_CHAT_MODEL if CHAT_PROVIDER == "gemini" else CLAUDE_MODEL,
    }


# ---------- Chatbot ----------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    # Optional stats the user pasted or that the dashboard sends along.
    context: str | None = Field(default=None, max_length=8000)


SYSTEM_PROMPT = (
    "You are the RoStats assistant for Roblox game developers. "
    "Answer briefly and concretely, in plain language, no markdown headers. "
    "If the developer shares stats from the Roblox Creator Dashboard, analyze them and give "
    "specific, practical suggestions. If you do not have data for a question, say what the "
    "developer should check in Creator Dashboard instead of guessing numbers."
)


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if CHAT_PROVIDER == "gemini":
        return await chat_gemini(req)
    if not ANTHROPIC_API_KEY:
        raise HTTPException(503, "Claude API key is not configured")
    system = SYSTEM_PROMPT
    if req.context:
        system += "\n\nDeveloper's data:\n" + req.context
    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": CLAUDE_MAX_TOKENS,
        "system": system,
        "messages": [m.model_dump() for m in req.messages],
    }
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=body,
        )
    if r.status_code != 200:
        raise HTTPException(502, f"Claude error {r.status_code}: {r.text[:300]}")
    data = r.json()
    text = "".join(p.get("text", "") for p in data.get("content", []) if p.get("type") == "text")
    return {"reply": text, "usage": data.get("usage")}


_UNSET = object()
_THINKING_OPTIONS = [{"thinkingLevel": "minimal"}, {"thinkingLevel": "low"}, {"thinkingBudget": 0}, None]
_THINKING_OK = _UNSET  # remembered per warm instance once a setting works


async def chat_gemini(req: ChatRequest, max_tokens: int = CLAUDE_MAX_TOKENS):
    if not GOOGLE_API_KEY:
        raise HTTPException(503, "Google API key is not configured")
    system = SYSTEM_PROMPT
    if req.context:
        system += "\n\nDeveloper's data:\n" + req.context
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {"role": "user" if m.role == "user" else "model", "parts": [{"text": m.content}]}
            for m in req.messages
        ],
        "generationConfig": {"maxOutputTokens": max_tokens},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_CHAT_MODEL}:generateContent"
    # Keep thinking as low as the model allows: faster and cheaper. Models differ in
    # which setting they accept, so try the cheapest first and fall back on 400.
    global _THINKING_OK
    options = [_THINKING_OK] if _THINKING_OK is not _UNSET else _THINKING_OPTIONS
    async with httpx.AsyncClient(timeout=60) as c:
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
    if r.status_code != 200:
        raise HTTPException(502, f"Gemini error {r.status_code}: {r.text[:300]}")
    data = r.json()
    text = "".join(
        p.get("text", "")
        for cand in data.get("candidates", [])[:1]
        for p in cand.get("content", {}).get("parts", [])
    )
    return {"reply": text.strip(), "usage": data.get("usageMetadata")}


@app.get("/api/chat/ping")
async def chat_ping():
    """Cheap live check: a tiny reply. Returns errors as JSON instead of failing."""
    req = ChatRequest(messages=[ChatMessage(role="user", content="Reply with the single word: ok")])
    try:
        return await chat_gemini(req, max_tokens=40)
    except HTTPException as e:
        models = []
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                "https://generativelanguage.googleapis.com/v1beta/models",
                params={"key": GOOGLE_API_KEY, "pageSize": 200},
            )
            if r.status_code == 200:
                models = [m["name"] for m in r.json().get("models", []) if "flash" in m["name"]]
        return {"ok": False, "error": e.detail, "model": GEMINI_CHAT_MODEL, "available_flash_models": models}


@app.get("/api/chat/diag")
async def chat_diag(model: str | None = None, i: int | None = None, t: float = 7, mode: str = "generate"):
    """Tries each thinking setting once with a short timeout and reports status and time."""
    import time
    m = model or GEMINI_CHAT_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent"
    out = []
    if mode == "interactions":
        start = time.time()
        async with httpx.AsyncClient(timeout=t) as c:
            try:
                r = await c.post(
                    "https://generativelanguage.googleapis.com/v1beta/interactions",
                    params={"key": GOOGLE_API_KEY},
                    json={"model": m, "input": "Say ok"},
                )
                return {"model": m, "mode": mode, "status": r.status_code, "secs": round(time.time() - start, 1), "body": r.text[:600]}
            except httpx.HTTPError as e:
                return {"model": m, "mode": mode, "error": e.__class__.__name__, "secs": round(time.time() - start, 1)}
    opts = _THINKING_OPTIONS if i is None else [_THINKING_OPTIONS[i]]
    async with httpx.AsyncClient(timeout=t) as c:
        for opt in opts:
            gc = {"maxOutputTokens": 20}
            if opt is not None:
                gc["thinkingConfig"] = opt
            body = {"contents": [{"role": "user", "parts": [{"text": "Say ok"}]}], "generationConfig": gc}
            t = time.time()
            try:
                r = await c.post(url, params={"key": GOOGLE_API_KEY}, json=body)
                out.append({"thinking": opt, "status": r.status_code, "secs": round(time.time() - t, 1), "body": r.text[:160]})
                if r.status_code == 200:
                    break
            except httpx.HTTPError as e:
                out.append({"thinking": opt, "error": e.__class__.__name__, "secs": round(time.time() - t, 1)})
    return {"model": m, "results": out}


# ---------- Art generator ----------

class ArtRequest(BaseModel):
    changes: str = Field(min_length=1, max_length=2000)
    style: Literal["Cartoon", "Anime"] = "Cartoon"
    kind: Literal["Thumbnail", "Icon", "Vector"] = "Thumbnail"
    # Reference images as data URLs or raw base64 (PNG/JPEG). Up to 4.
    images: list[str] = Field(default_factory=list, max_length=4)
    count: int = Field(default=1, ge=1, le=4)


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
        mime = head[5:].split(";")[0] or "image/png"
        return mime, b64
    return "image/png", s


@app.post("/api/art")
async def art(req: ArtRequest):
    if not GOOGLE_API_KEY:
        raise HTTPException(503, "Google API key is not configured")
    prompt = (
        f"Create {KIND_HINTS[req.kind]} in {STYLE_HINTS[req.style]}. "
        + ("Use the attached reference image(s) as the base and apply these changes: " if req.images else "")
        + req.changes
        + ". No text or watermarks in the image."
    )
    parts: list[dict] = [{"text": prompt}]
    for img in req.images:
        mime, b64 = _split_data_url(img)
        parts.append({"inline_data": {"mime_type": mime, "data": b64}})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_IMAGE_MODEL}:generateContent"
    aspect = "16:9" if req.kind == "Thumbnail" else "1:1"
    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": aspect},
        },
    }
    results: list[str] = []
    async with httpx.AsyncClient(timeout=120) as c:
        for _ in range(req.count):
            r = await c.post(url, params={"key": GOOGLE_API_KEY}, json=body)
            if r.status_code != 200:
                raise HTTPException(502, f"Gemini error {r.status_code}: {r.text[:300]}")
            data = r.json()
            for cand in data.get("candidates", []):
                for p in cand.get("content", {}).get("parts", []):
                    inline = p.get("inlineData") or p.get("inline_data")
                    if inline:
                        mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                        results.append(f"data:{mime};base64,{inline['data']}")
    if not results:
        raise HTTPException(502, "Gemini returned no image")
    return {"images": results, "prompt": prompt}


# ---------- Public Roblox data (no key needed) ----------

@app.get("/api/roblox/universe")
async def universe_from_place(placeId: int):
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"https://apis.roblox.com/universes/v1/places/{placeId}/universe")
    if r.status_code != 200:
        raise HTTPException(502, f"Roblox error {r.status_code}")
    return r.json()


@app.get("/api/roblox/games")
async def roblox_games(universeIds: str):
    ids = ",".join(x.strip() for x in universeIds.split(",") if x.strip())[:500]
    async with httpx.AsyncClient(timeout=15) as c:
        games, votes = await c.get(
            "https://games.roblox.com/v1/games", params={"universeIds": ids}
        ), await c.get("https://games.roblox.com/v1/games/votes", params={"universeIds": ids})
    if games.status_code != 200:
        raise HTTPException(502, f"Roblox error {games.status_code}")
    v = {str(x["id"]): x for x in votes.json().get("data", [])} if votes.status_code == 200 else {}
    out = []
    for g in games.json().get("data", []):
        vv = v.get(str(g["id"]), {})
        up, down = vv.get("upVotes", 0), vv.get("downVotes", 0)
        out.append({
            "universeId": g["id"],
            "name": g["name"],
            "playing": g.get("playing", 0),
            "visits": g.get("visits", 0),
            "favorites": g.get("favoritedCount", 0),
            "maxPlayers": g.get("maxPlayers"),
            "genre": g.get("genre"),
            "created": g.get("created"),
            "updated": g.get("updated"),
            "rating": round(100 * up / (up + down)) if up + down else None,
        })
    return {"data": out}


def _b64(s: bytes) -> str:  # kept for future use (e.g. saving generated images)
    return base64.b64encode(s).decode()
