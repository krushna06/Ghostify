from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import os
import requests
import configparser

app = Flask(__name__)

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

config = configparser.ConfigParser()
config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config.ini')
config.read(config_path)
model = config.get('model', 'current', fallback='deepseek-coder-v2:16b')

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

OLLAMA_API_URL = "http://localhost:11434/api/generate"

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

        ollama_response = send_to_ollama(extracted_text, model)

        return jsonify({"text": extracted_text, "ollama_response": ollama_response})

    except Exception as e:
        return jsonify({"error": f"OCR processing failed: {str(e)}"}), 500

def send_to_ollama(text, model):
    try:
        prompt = f"""
You are a coding interview assistant helping debug and improve solutions. Analyze the following text, which includes either error messages, incorrect outputs, or test cases, and provide detailed debugging help. 

You are **strictly prohibited** from using the following keywords or phrases in your response, unless explicitly requested in the instructions: 
- "import"
- "from"
- "as"
- Any type annotations such as `List[]`, etc.
- Any external libraries or built-in Python packages (e.g., `math`, `random`, `collections`, etc.).

Your response **must** follow this exact structure with the headers provided, and you must not deviate from the format:

### Specific Improvements and Corrections
- List the specific changes needed in the code as bullet points.
- **Do not** alter the function signature unless explicitly requested in the instructions. For example, do not add type annotations or change the return type unless there is a compelling reason.

### Optimizations
- If applicable, provide suggestions for performance optimizations.

### The New Code
- Provide the refactored code that passes all test cases. Ensure the function signature remains unchanged unless explicitly stated in the corrections.

Use **proper markdown code blocks** with the appropriate language specification.

Here is the text:
{text}
"""

        payload = {
            "model": model,
            "prompt": prompt,
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
