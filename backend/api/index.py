"""RoStats API. Small FastAPI app deployed as a single Vercel function.

Endpoints:
  GET  /api/health              service status, which keys are configured
  POST /api/chat                chatbot backed by Claude (cheapest model, short answers)
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
GEMINI_IMAGE_MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")

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
