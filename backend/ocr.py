from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import io
import requests
import os

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

app = Flask(__name__)

def process_image(image_data):
    try:
        image = Image.open(io.BytesIO(image_data))
        
        text = pytesseract.image_to_string(image)
        
        return text.strip()
    except Exception as e:
        return f"Error processing image: {str(e)}"

@app.route('/process-image', methods=['POST'])
def process_image_route():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        image_file = request.files['image']
        image_data = image_file.read()
        
        model = request.headers.get('X-Model', 'qwen2.5:0.5b')
        ollama_url = request.headers.get('X-Ollama-Url', 'http://localhost:11434')
        
        text = process_image(image_data)
        
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

        try:
            response = requests.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            )
            ollama_response = response.json().get('response', 'No response from OLLAMA')
        except Exception as e:
            ollama_response = f"Error getting OLLAMA response: {str(e)}"
        
        return jsonify({
            'text': text,
            'ollama_response': ollama_response
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    try:
        pytesseract.get_tesseract_version()
    except Exception as e:
        print(f"Error: Tesseract OCR is not installed. Please install it first.")
        print(f"Download from: https://github.com/tesseract-ocr/tesseract/releases")
        exit(1)
    
    app.run(host='127.0.0.1', port=5001)
