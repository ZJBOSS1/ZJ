import logging
import os

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from openai import OpenAI

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024  # 64 KB request limit

allowed_origins = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
# Same-origin browser requests do not require CORS. Configure ALLOWED_ORIGINS
# only when a separate frontend domain must call this backend.
if allowed_origins:
    CORS(app, resources={r"/api/*": {"origins": allowed_origins},
                         r"/chat": {"origins": allowed_origins}})

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
SYSTEM_PROMPT = (
    "You are ZJ Bot, a helpful AI assistant built into ZJ OS. "
    "Respond in plain conversational text. Be accurate, clear, and concise."
)
client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY or "missing-api-key"
)

ALLOWED_STATIC_FILES = {
    "index.html", "manifest.json", "sw.js", "favicon.ico",
    "ZJPP.jpeg", "bmw.jpeg"
}


@app.get("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/health")
def health():
    return jsonify({"status": "ok", "ai_configured": bool(GROQ_API_KEY)})


@app.get("/<path:filename>")
def static_files(filename):
    # Prevent source/config files from being served through the catch-all route.
    if filename not in ALLOWED_STATIC_FILES:
        return jsonify({"error": "Not found."}), 404
    return send_from_directory(BASE_DIR, filename)


@app.route("/chat", methods=["POST", "OPTIONS"])
@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        return response, 200

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON request."}), 400

    messages = data.get("messages")
    if messages is None:
        single_message = data.get("message", "")
        if not isinstance(single_message, str) or not single_message.strip():
            return jsonify({"error": "Please enter a message."}), 400
        messages = [{"role": "user", "content": single_message.strip()}]

    if not isinstance(messages, list) or not 1 <= len(messages) <= 20:
        return jsonify({"error": "Message history must contain between 1 and 20 messages."}), 400

    validated = []
    total_chars = 0
    for item in messages:
        if not isinstance(item, dict):
            return jsonify({"error": "Invalid message format."}), 400
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant"):
            return jsonify({"error": "Unsupported message role."}), 400
        if not isinstance(content, str) or not content.strip():
            return jsonify({"error": "Message content must not be empty."}), 400
        if len(content) > 8000:
            return jsonify({"error": "A message is too long."}), 400
        total_chars += len(content)
        validated.append({"role": role, "content": content.strip()})

    if total_chars > 24000:
        return jsonify({"error": "Conversation context is too large."}), 413

    if not GROQ_API_KEY:
        app.logger.error("GROQ_API_KEY is not configured")
        return jsonify({"error": "AI service is not configured on the server."}), 503

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}, *validated],
            temperature=0.6,
            max_tokens=500,
            timeout=30.0,
        )
        reply = response.choices[0].message.content or ""
        if not reply.strip():
            return jsonify({"error": "The AI service returned an empty response."}), 502
        return jsonify({"reply": reply.strip()})
    except Exception:
        app.logger.exception("Chat provider request failed")
        return jsonify({"error": "The AI service is temporarily unavailable. Please try again."}), 502


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    app.run(host="127.0.0.1", port=5000, debug=False)
