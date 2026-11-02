"""
ZJ OS backend — Flask + Groq (OpenAI-compatible SDK).

Deployed on Vercel via `app.py`:  from zj_chatbot import app

State lives in the browser. This process is stateless.
Every log line is structured JSON. Message content is never logged.

Env vars (see .env.example):
  AI_API_KEY        required — Groq key
  AI_BASE_URL       default https://api.groq.com/openai/v1
  AI_MODEL          default llama-3.3-70b-versatile
  GROQ_MAX_TOKENS   default 800
  ALLOWED_ORIGINS   comma-separated; empty = same-origin only
  RATELIMIT_STORAGE_URI  default memory:// (per-instance on Vercel;
                         set Redis URL for true global limiting)
  ENABLE_STRICT_CSP  set to "1" only after Phase 3 JS extraction
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from typing import Any

from flask import Flask, Response, g, jsonify, request, send_from_directory, stream_with_context
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI

# ---------- config ----------------------------------------------------------

AI_API_KEY = os.environ.get("AI_API_KEY") or os.environ.get("GROQ_API_KEY", "")
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://api.groq.com/openai/v1")
AI_MODEL = os.environ.get("AI_MODEL", "llama-3.3-70b-versatile")
MAX_TOKENS = int(os.environ.get("GROQ_MAX_TOKENS", "800"))
WALL_CLOCK_S = 45
STRICT_CSP = os.environ.get("ENABLE_STRICT_CSP") == "1"

_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

CSP = (
    "default-src 'self'; "
    "script-src 'self' https://unpkg.com https://cdn.tailwindcss.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src 'self' data: https:; "
    "connect-src 'self' https://api.open-meteo.com "
    "https://geocoding-api.open-meteo.com https://api.groq.com;"
)

# ---------- app + limiter ---------------------------------------------------

app = Flask(__name__, static_folder=None)  # we serve statics ourselves
CORS(
    app,
    resources={r"/api/*": {"origins": _ALLOWED_ORIGINS or "*"}},
    supports_credentials=False,
)

# NOTE: memory:// means per-lambda-instance counting on Vercel. If you need a
# true global 20/min, set RATELIMIT_STORAGE_URI=redis://… . Good enough for
# single-user ZJ OS; documented in README.
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[],
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://"),
)

# ---------- logging ---------------------------------------------------------

logging.basicConfig(level=logging.INFO, format="%(message)s")


@app.before_request
def _req_start() -> None:
    g.request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    g.started_at = time.monotonic()


@app.after_request
def _req_log(resp: Response) -> Response:
    if request.path.startswith(("/api/", "/chat")):
        app.logger.info(
            json.dumps(
                {
                    "level": "info",
                    "request_id": g.get("request_id"),
                    "path": request.path,
                    "status": resp.status_code,
                    "duration_ms": int((time.monotonic() - g.started_at) * 1000),
                }
            )
        )
    return resp


# ---------- security headers ------------------------------------------------

@app.after_request
def _security_headers(resp: Response) -> Response:
    if STRICT_CSP:
        resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return resp


# ---------- error handlers (JSON, never HTML) -------------------------------

def _err(status: int, msg: str, extra: dict[str, Any] | None = None) -> Response:
    body = {"error": msg}
    if extra:
        body.update(extra)
    return jsonify(body), status


@app.errorhandler(400)
def _e400(_e): return _err(400, "Bad request")


@app.errorhandler(404)
def _e404(_e): return _err(404, "Not found")


@app.errorhandler(413)
def _e413(_e): return _err(413, "Payload too large")


@app.errorhandler(429)
def _e429(e):
    retry = 60
    try:
        m = re.search(r"(\d+)\s*second", str(getattr(e, "description", "")))
        if m:
            retry = int(m.group(1))
    except Exception:
        pass
    return _err(429, f"Too many requests. Try again in {retry} seconds.", {"retry_after": retry})


@app.errorhandler(500)
def _e500(_e): return _err(500, "Internal server error")


# ---------- Groq client -----------------------------------------------------

_client_singleton: OpenAI | None = None


def _client() -> OpenAI:
    global _client_singleton
    if _client_singleton is None:
        _client_singleton = OpenAI(api_key=AI_API_KEY, base_url=AI_BASE_URL)
    return _client_singleton


# ---------- validation + prompt-injection defense ---------------------------

_MAX_MESSAGES = 50
_MAX_CONTENT = 8_000
_MAX_CONTEXT = 16_000


def _validate_messages(body: dict) -> tuple[list[dict] | None, str | None]:
    msgs = body.get("messages")
    if not isinstance(msgs, list) or not msgs:
        return None, "messages must be a non-empty array"
    if len(msgs) > _MAX_MESSAGES:
        return None, f"too many messages (max {_MAX_MESSAGES})"
    cleaned: list[dict] = []
    for m in msgs:
        if not isinstance(m, dict):
            return None, "each message must be an object"
        role, content = m.get("role"), m.get("content")
        if role not in ("user", "assistant", "system"):
            return None, "invalid role"
        if not isinstance(content, str) or not content or len(content) > _MAX_CONTENT:
            return None, "invalid content"
        cleaned.append({"role": role, "content": content})
    return cleaned, None


def _safe_context(ctx: Any) -> str:
    """Neutralize attempts to close our <zj_os_context> wrapper."""
    if not isinstance(ctx, str):
        return ""
    return ctx.replace("</zj_os_context>", "&lt;/zj_os_context&gt;")[:_MAX_CONTEXT]


def _system_content(app_context: Any) -> str:
    base = (
        "You are ZJ OS Assistant — a concise, practical productivity coach "
        "embedded in the user's personal dashboard. Answer in the user's "
        "language, prefer short bullet points, never invent user data."
    )
    ctx = _safe_context(app_context)
    if ctx:
        base += f"\n\n<zj_os_context>\n{ctx}\n</zj_os_context>"
    return base


# ---------- static file allowlist (preserved from original design) ----------

_TOP_FILES = {
    "index.html", "manifest.json", "sw.js", "favicon.ico",
    "zj-enhancements.js", "ZJPP.jpeg", "bmw.jpeg",
}
_DYNAMIC_RE = re.compile(r"^(js|styles)/[A-Za-z0-9_.-]+\.(js|css)$")


@app.get("/")
def root() -> Response:
    return send_from_directory(".", "index.html")


@app.get("/<path:filename>")
def static_file(filename: str) -> Response:
    if ".." in filename or filename.startswith("/"):
        return _err(404, "Not found")
    if filename in _TOP_FILES or _DYNAMIC_RE.match(filename):
        try:
            return send_from_directory(".", filename)
        except Exception:
            return _err(404, "Not found")
    return _err(404, "Not found")


# ---------- health ----------------------------------------------------------

@app.get("/health")
def health_shallow() -> Response:
    """Kept for backward compat with existing status dot polling."""
    return jsonify({"status": "ok", "ai_configured": bool(AI_API_KEY)})


@app.get("/api/health")
def health_deep() -> Response:
    if not AI_API_KEY:
        return jsonify(
            {"status": "ok", "provider": "groq", "model": AI_MODEL,
             "ai_configured": False, "latency_ms": None}
        )
    t0 = time.monotonic()
    try:
        _client().chat.completions.create(
            model=AI_MODEL,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
            timeout=5.0,
        )
        return jsonify(
            {"status": "ok", "provider": "groq", "model": AI_MODEL,
             "ai_configured": True,
             "latency_ms": int((time.monotonic() - t0) * 1000)}
        )
    except Exception:
        app.logger.warning(
            json.dumps({"level": "warn", "event": "health_ping_failed",
                        "request_id": g.get("request_id")})
        )
        return jsonify(
            {"status": "degraded", "provider": "groq", "model": AI_MODEL,
             "ai_configured": True, "latency_ms": None, "error": "upstream failed"}
        ), 503


# ---------- streaming chat (the hero) --------------------------------------

def _sse(obj: dict) -> str:
    return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"


@app.post("/api/chat")
@limiter.limit("20/minute")
def chat_stream() -> Response:
    body = request.get_json(silent=True) or {}
    messages, err = _validate_messages(body)
    if err:
        return _err(400, err)
    if not AI_API_KEY:
        return _err(503, "AI service not configured")

    system = _system_content(body.get("app_context", ""))
    client = _client()
    deadline = time.monotonic() + WALL_CLOCK_S

    def generate():
        try:
            stream = client.chat.completions.create(
                model=AI_MODEL,
                messages=[{"role": "system", "content": system}, *messages],
                temperature=0.6,
                max_tokens=MAX_TOKENS,
                stream=True,
                timeout=WALL_CLOCK_S,
            )
            for chunk in stream:
                if time.monotonic() > deadline:
                    yield _sse({"type": "error", "message": "AI service timed out"})
                    return
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield _sse({"type": "token", "delta": delta})
            yield _sse({"type": "done"})
        except Exception:
            app.logger.exception(
                json.dumps({"level": "error", "event": "stream_failed",
                            "request_id": g.get("request_id")})
            )
            yield _sse({"type": "error", "message": "AI service unavailable"})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"},
    )


# ---------- sync chat (backward compat) ------------------------------------

@app.post("/api/chat/sync")
@app.post("/chat")
@limiter.limit("20/minute")
def chat_sync() -> Response:
    body = request.get_json(silent=True) or {}
    messages, err = _validate_messages(body)
    if err:
        return _err(400, err)
    if not AI_API_KEY:
        return _err(503, "AI service not configured")

    system = _system_content(body.get("app_context", ""))
    try:
        resp = _client().chat.completions.create(
            model=AI_MODEL,
            messages=[{"role": "system", "content": system}, *messages],
            temperature=0.6,
            max_tokens=MAX_TOKENS,
            timeout=WALL_CLOCK_S,
        )
        return jsonify({"reply": resp.choices[0].message.content, "model": AI_MODEL})
    except Exception:
        app.logger.exception(
            json.dumps({"level": "error", "event": "sync_failed",
                        "request_id": g.get("request_id")})
        )
        return _err(502, "AI service unavailable")
