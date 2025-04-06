from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import os
import requests

app = Flask(__name__)

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

OLLAMA_API_URL = "https://11434-krushna06-nullrepo-ke9esi8zzg8.ws-us118.gitpod.io/api/generate"

@app.route('/process-image', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    image = request.files['image']
    image_path = os.path.join(UPLOAD_FOLDER, "temp_screenshot.png")
    image.save(image_path)

    try:
        extracted_text = pytesseract.image_to_string(Image.open(image_path))
        extracted_text = extracted_text.strip()

        if not extracted_text:
            extracted_text = "No readable text found."

        print(f"📸 OCR Extracted Text: {extracted_text}")

        ollama_response = send_to_ollama(extracted_text)

        return jsonify({"text": extracted_text, "ollama_response": ollama_response})

    except Exception as e:
        return jsonify({"error": f"OCR processing failed: {str(e)}"}), 500

def send_to_ollama(text):
    try:
        payload = {
            "model": "deepseek-coder-v2:16b",
            "prompt": text,
            "stream": False
        }
        
        headers = {"Content-Type": "application/json"}

        print(f"🔗 Sending request to Ollama: {OLLAMA_API_URL}")
        print(f"📤 Payload: {payload}")

        response = requests.post(OLLAMA_API_URL, json=payload, headers=headers)

        print(f"📥 Response Status: {response.status_code}")
        print(f"📜 Response Data: {response.text}")

        if response.status_code == 200:
            return response.json().get("response", "No response from Ollama.")
        else:
            return f"Error: {response.status_code} - {response.text}"

    except Exception as e:
        return f"Failed to connect to Ollama: {str(e)}"

if __name__ == '__main__':
    app.run(port=5001, debug=True)
