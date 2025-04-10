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
   # Install Python dependencies
   pip install -r requirements.txt

   # Install Node.js dependencies
   cd frontend
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Configuration

Edit `config.ini` to customize Ghostify's behavior:

```ini
[settings]
model = gpt-3.5-turbo
api_key = your_api_key_here
language = eng
```

## Usage

1. Launch Ghostify
2. Use the hotkeys to capture screen content
3. View AI-generated responses in the overlay window
4. Use the settings menu to customize behavior

### Hotkeys

- `Ctrl + A`: Capture entire screen
- `Ctrl + S`: Capture selected area
- `Ctrl + D`: Toggle visibility
- `Ctrl + W`: Close application

## Building from Source

To build the application:

```bash
cd frontend
npm run dist
```

The installer will be created in the `dist` directory.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/) for the desktop application framework
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) for text recognition
- [OpenAI](https://openai.com/) for AI capabilities

## Support

For support, please [open an issue](https://github.com/krushna06/Ghostify/issues) or contact the maintainers.

## Roadmap

- [ ] Add support for more OCR languages
- [ ] Implement custom model support
- [ ] Add plugin system
- [ ] Improve UI/UX
- [ ] Add cloud sync capabilities

## Security

Ghostify is designed with privacy in mind:
- No data is stored locally without permission
- API keys are encrypted
- Network requests are secure
- No telemetry or tracking

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and changes.