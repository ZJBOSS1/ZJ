from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import re
import os

app = Flask(__name__, static_folder=None)
CORS(app)

# Reads the key from Render's Environment Variables (or your local .env)
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY
)

# Fallback models (starts with the most stable one)
MODEL_CANDIDATES = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "qwen/qwen3-32b",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
]

SYSTEM_PROMPT = (
    "You are ZJ Bot, a helpful AI assistant. "
    "CRITICAL: Respond in plain conversational text ONLY. "
    "Do NOT use Markdown formatting. Do NOT use asterisks (** or *) for bold or italics. "
    "Do NOT use hashtags (#) for headings. Do NOT use backticks (`) for code. "
    "Just write normal, plain sentences. Keep answers brief."
)

def force_ascii(text):
    """Strip non-ASCII, Markdown formatting, and junk symbols."""
    if not text:
        return text
    cleaned = ''.join(c for c in text if c == '\n' or c == '\t' or (32 <= ord(c) < 127))
    cleaned = cleaned.replace('**', '').replace('*', '').replace('##', '').replace('#', '')
    cleaned = re.sub(r'[<>|{}\[\]\\#@&$%^~`]{3,}', '', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    cleaned = re.sub(r' {3,}', '  ', cleaned)
    return cleaned.strip()

def is_garbage(text):
    if not text or not text.strip():
        return True
    printable = sum(1 for c in text if c.isalnum() or c in ' .,!?;:\'"()-\n\t')
    if printable / len(text) < 0.80:
        return True
    return False

@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get('message', '').strip()

    if not user_message:
        return jsonify({'reply': 'Please type a message.'})

    last_error = None

    for model_name in MODEL_CANDIDATES:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.6,
                max_tokens=300,
                top_p=0.9,
                frequency_penalty=0.4,
                presence_penalty=0.2,
            )
            reply = response.choices[0].message.content or ""
            reply = force_ascii(reply)

            if reply.strip() and not is_garbage(reply):
                print(f"[OK] {model_name} replied ({len(reply)} chars)")
                return jsonify({'reply': reply})
            else:
                last_error = f"{model_name} returned garbage"

        except Exception as e:
            last_error = str(e)[:150]
            continue

    return jsonify({
        'reply': f'All models failed. Last error: {last_error}'
    }), 500

if __name__ == '__main__':
    print("ZJ Website server running on port 5000")
    app.run(host='0.0.0.0', port=5000, debug=False)