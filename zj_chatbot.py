from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import os

app = Flask(__name__, static_folder=None)
CORS(app)

# --- SECURE: Reads from Vercel Environment Variables ---
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

# Check if key is missing and print a warning in the terminal
if not GROQ_API_KEY:
    print("⚠️ WARNING: GROQ_API_KEY environment variable is missing!")

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY
)

MODEL = "llama-3.1-8b-instant"
SYSTEM_PROMPT = "You are ZJ Bot, a helpful AI assistant. Respond in plain conversational text only."

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

    # If key is missing, return a clean error
    if not GROQ_API_KEY:
        return jsonify({'reply': '⚠️ Server API key is not configured.'}), 500

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.6,
            max_tokens=300
        )
        reply = response.choices[0].message.content
        return jsonify({'reply': reply})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'reply': '⚠️ Cannot connect to AI. Check server logs.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
