from flask import Flask, request, jsonify
import pytesseract
from PIL import Image
import io
import requests
import os

app = Flask(__name__)

def process_image(image_data):
    try:
        # Convert image data to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Perform OCR
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
        
        # Get model and OLLAMA URL from headers
        model = request.headers.get('X-Model', 'deepseek-coder-v2:16b')
        ollama_url = request.headers.get('X-Ollama-Url', 'http://localhost:11434')
        
        # Process image with OCR
        text = process_image(image_data)
        
        # Get response from OLLAMA
        try:
            response = requests.post(
                f"{ollama_url}/api/generate",
                json={
                    "model": model,
                    "prompt": text,
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
    # Check if Tesseract is installed
    try:
        pytesseract.get_tesseract_version()
    except Exception as e:
        print(f"Error: Tesseract OCR is not installed. Please install it first.")
        print(f"Download from: https://github.com/tesseract-ocr/tesseract/releases")
        exit(1)
    
    app.run(host='127.0.0.1', port=5001)
