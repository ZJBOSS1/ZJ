"""
ZJ OS — Flask backend
Serves the single-page dashboard, static assets, the service worker,
and proxies chat requests to the Groq API (OpenAI-compatible).

Environment variables:
    GROQ_API_KEY       (required)  API key for Groq
    GROQ_MODEL         (optional)  default: openai/gpt-oss-120b
    ALLOWED_ORIGINS    (optional)  comma-separated list, default: "*"
"""

import os
import logging

from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from openai import OpenAI

# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("zj")

# --------------------------------------------------------------------------- #
# App setup
# --------------------------------------------------------------------------- #
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=None)  # we serve files manually

# CORS — locked down to /chat only. Set ALLOWED_ORIGINS in production.
_allowed = os.environ.get("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _allowed.split(",") if o.strip()] or ["*"]
CORS(app, resources={r"/chat": {"origins": _origins}})

# Rate limiting — in-memory by default. For multi-instance deployments,
# point RATELIMIT_STORAGE_URI at Redis.
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["300 per day", "100 per hour"],
    storage_uri=os.environ.get("RATELIMIT_STORAGE_URI", "memory://"),
)

# --------------------------------------------------------------------------- #
# Groq client — original model & inference parameters preserved
# --------------------------------------------------------------------------- #
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
SYSTEM_PROMPT = (
    "You are ZJ Bot, a helpful AI assistant. "
    "Respond in plain conversational text only. "
    "Do not use markdown or special characters."
)
TEMPERATURE = 0.6
MAX_TOKENS = 300
MAX_MESSAGE_CHARS = 4000

_client = None


def get_client() -> OpenAI:
    """Lazily construct the Groq client so import-time never fails."""
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set")
        _client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    return _client


# --------------------------------------------------------------------------- #
# Security headers
# --------------------------------------------------------------------------- #
@app.after_request
def add_security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return resp


# --------------------------------------------------------------------------- #
# Static / app shell
# --------------------------------------------------------------------------- #
@app.route("/")
def home():
    resp = make_response(send_from_directory(BASE_DIR, "index.html"))
    resp.headers["Cache-Control"] = "no-cache, must-revalidate"
    return resp


@app.route("/sw.js")
def service_worker():
    # Service workers must NOT be cached aggressively and need the right MIME type.
    resp = make_response(
        send_from_directory(BASE_DIR, "sw.js", mimetype="application/javascript")
    )
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Service-Worker-Allowed"] = "/"
    return resp


@app.route("/manifest.json")
def manifest():
    resp = make_response(
        send_from_directory(BASE_DIR, "manifest.json", mimetype="application/manifest+json")
    )
    resp.headers["Cache-Control"] = "public, max-age=3600"
    return resp


@app.route("/<path:filename>")
def static_files(filename):
    """
    Catch-all static file server. Flask's send_from_directory already blocks
    path traversal. Long cache for static assets, short for the rest.
    """
    resp = make_response(send_from_directory(BASE_DIR, filename))
    if filename.endswith((".js", ".css", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico")):
        resp.headers["Cache-Control"] = "public, max-age=86400"
    else:
        resp.headers["Cache-Control"] = "public, max-age=300"
    return resp


# --------------------------------------------------------------------------- #
# Chat endpoint — original response contract: {"reply": "..."}
# --------------------------------------------------------------------------- #
@app.route("/chat", methods=["POST"])
@limiter.limit("15 per minute; 300 per day")
def chat():
    if not request.is_json:
        return jsonify({"reply": "Please send a JSON request."}), 415

    payload = request.get_json(silent=True) or {}
    message = payload.get("message", "").strip()

    if not message:
        # Matches the original front-end expectation.
        return jsonify({"reply": "Please type a message."}), 400

    if len(message) > MAX_MESSAGE_CHARS:
        return jsonify({"reply": f"Message exceeds {MAX_MESSAGE_CHARS} characters."}), 413

    try:
        client = get_client()
    except RuntimeError as exc:
        log.error("Chat misconfiguration: %s", exc)
        return jsonify({"reply": "Chat service is not configured."}), 503

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
        )
        reply = completion.choices[0].message.content
    except Exception:
        # Log the full traceback server-side; never leak it to the client.
        log.exception("Groq request failed")
        return jsonify({"reply": "⚠️ Cannot connect to AI. Check server logs."}), 502

    return jsonify({"reply": reply})


# --------------------------------------------------------------------------- #
# Health check (useful for Vercel / uptime monitors)
# --------------------------------------------------------------------------- #
@app.route("/healthz")
def healthz():
    return jsonify(status="ok"), 200


# --------------------------------------------------------------------------- #
# Local development entrypoint
# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
