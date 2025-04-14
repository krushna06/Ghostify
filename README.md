# Ghostify

A discreet desktop application that enables you to retrieve answers without being detected by other software, all while staying visible above other applications.

## Features

- **Stealth Mode**: Operates discreetly without being detected by other applications
- **Always on Top**: Stays visible above other windows for quick access
- **OCR Integration**: Built-in OCR capabilities for text extraction
- **AI-Powered**: Smart responses using advanced AI models
- **Cross-Platform**: Available for Windows, macOS, and Linux
- **Customizable**: Configurable settings through `config.ini`

## Installation

### Prerequisites

- Node.js (v16 or higher)
- Python 3.8 or higher
- Tesseract OCR (for text recognition)

### Windows Installation

1. Download the latest release from [GitHub Releases](https://github.com/krushna06/Ghostify/releases)
2. Run the installer (`Ghostify-Setup-x.x.x.exe`)
3. Follow the installation wizard
4. Launch Ghostify from the Start Menu or desktop shortcut

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/krushna06/Ghostify.git
   cd Ghostify
   ```

2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt

   cd frontend
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
### Hotkeys

- `Ctrl + A`: Capture entire screen
- `Ctrl + S`: Capture selected area
- `Ctrl + D`: Toggle visibility
- `Ctrl + W`: Close application


## Techstack

- [Electron](https://www.electronjs.org/) for the desktop application framework
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) for text recognition

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.