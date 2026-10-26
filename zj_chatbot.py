from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openai import OpenAI
import os
import traceback

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=None)
CORS(app, resources={r"/*": {"origins": "*"}})

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=GROQ_API_KEY)
MODEL = "openai/gpt-oss-20b" # Updated model
SYSTEM_PROMPT = "You are ZJ Bot, a helpful AI assistant built into the ZJ Titan OS. Respond in plain conversational text only. Keep responses concise."

@app.route('/')
def home(): return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename): return send_from_directory(BASE_DIR, filename)

@app.route('/chat', methods=['POST', 'OPTIONS'])
@app.route('/api/chat', methods=['POST', 'OPTIONS'])
def chat():
    if request.method == 'OPTIONS': return jsonify({'status': 'ok'}), 200

    data = request.get_json(silent=True) or {}
    
    # --- CONTEXT WINDOW LOGIC ---
    # The frontend sends 'messages' (array of {role, content}).
    # If it's an older frontend, it sends 'message' (string).
    messages = data.get('messages', [])
    
    if not messages:
        # Fallback for single message
        single_msg = data.get('message', '').strip()
        if not single_msg: return jsonify({'reply': 'Please type a message.'}), 400
        messages = [{"role": "user", "content": single_msg}]
    else:
        # Inject the system prompt at the beginning of the array
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    if not GROQ_API_KEY:
        return jsonify({'reply': '⚠️ Server API key is not configured.'}), 500

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages, # Send the whole history
            temperature=0.6,
            max_tokens=500,
        )
        reply = response.choices[0].message.content
        return jsonify({'reply': reply})

    except Exception as e:
        print("--- CHAT ERROR ---")
        traceback.print_exc()
        return jsonify({'reply': f'⚠️ Cannot connect to AI. Error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
