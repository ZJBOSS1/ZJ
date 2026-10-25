from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import os
import traceback

# Absolute path to the project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- SECURE: reads from Vercel Environment Variables ---
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

if not GROQ_API_KEY:
    print("⚠️ WARNING: GROQ_API_KEY environment variable is missing!")

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
)

MODEL = "llama-3.1-8b-instant"
SYSTEM_PROMPT = (
    "You are ZJ Bot, a helpful AI assistant. "
    "Respond in plain conversational text only. Keep responses concise."
)

# ----- Static file serving -----
@app.route('/')
def home():
    return send_from_directory(BASE_DIR, 'index.html')

# FIXED: was incorrectly @app.route('/')
@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)


# ----- API endpoint (Handles BOTH /chat and /api/chat) -----
@app.route('/chat', methods=['POST', 'OPTIONS'])
@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200

    data = request.get_json(silent=True) or {}
    user_message = data.get('message', '').strip()

    if not user_message:
        return jsonify({'reply': 'Please type a message.'}), 400

    if not GROQ_API_KEY:
        return jsonify({
            'reply': '⚠️ Server API key is not configured. '
                     'Add GROQ_API_KEY in the hosting dashboard and redeploy.'
        }), 500

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.6,
            max_tokens=300,
        )
        reply = response.choices[0].message.content
        return jsonify({'reply': reply})

    except Exception as e:
        print("--- CHAT ERROR ---")
        traceback.print_exc()
        return jsonify({
            'reply': f'⚠️ Cannot connect to AI. Error: {str(e)}'
        }), 500


if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=os.environ.get('FLASK_DEBUG') == '1',
    )
