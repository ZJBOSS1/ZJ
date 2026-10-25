from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import os
import traceback

# FIXED: Since zj_chatbot.py is in the root folder, BASE_DIR is just its own directory.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/*": {"origins": "*"}})

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

if not GROQ_API_KEY:
    print("⚠️ WARNING: GROQ_API_KEY environment variable is missing!")

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY,
)

MODEL = "openai/gpt-oss-20b"
SYSTEM_PROMPT = "You are ZJ Bot, a helpful AI assistant. Respond in plain conversational text only. Keep responses concise."

# ----- Serve the main HTML file -----
@app.route('/')
def home():
    return send_from_directory(BASE_DIR, 'index.html')

# FIXED: Your original code had @app.route('/') here, which caused a conflict.
@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)

# ----- API Endpoint (Handles both paths) -----
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
            'reply': '⚠️ Server API key is not configured. Add GROQ_API_KEY in Vercel and redeploy.'
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
        return jsonify({'reply': f'⚠️ Cannot connect to AI. Error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
