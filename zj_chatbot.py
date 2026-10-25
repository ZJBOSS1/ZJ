from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import os

# Initialize Flask. We set static_folder to None because we handle static files manually below.
app = Flask(__name__, static_folder=None)
CORS(app)

# --- SECURE: Reads from Vercel Environment Variables ---
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

if not GROQ_API_KEY:
    print("⚠️ WARNING: GROQ_API_KEY environment variable is missing!")

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=GROQ_API_KEY
)

MODEL = "llama-3.1-8b-instant"
SYSTEM_PROMPT = "You are ZJ Bot, a helpful AI assistant. Respond in plain conversational text only. Keep responses concise."

# Serve the main HTML file
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

# Serve other static files (CSS, JS, images if you had them separate)
@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# API Endpoint
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get('message', '').strip()

    if not user_message:
        return jsonify({'reply': 'Please type a message.'})

    # If key is missing, return a clean error
    if not GROQ_API_KEY:
        return jsonify({'reply': '⚠️ Server API key is not configured. Please check Vercel settings.'}), 500

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
        print(f"Error calling Groq API: {e}")
        return jsonify({'reply': '⚠️ Cannot connect to AI. Check server logs.'}), 500

if __name__ == '__main__':
    # Run on port 5000 for local development
    app.run(host='0.0.0.0', port=5000, debug=True)
