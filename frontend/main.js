const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const { writeFile, createReadStream } = require('fs');
const path = require('path');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const FormData = require('form-data');

let mainWindow;
let chatHistory = [];

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');

  globalShortcut.register('Control+K', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  globalShortcut.register('Control+Enter', () => {
    takeScreenshot();
  });

  globalShortcut.register('Control+H', () => {
    mainWindow.webContents.send('show-chat-history', chatHistory);
  });

  function takeScreenshot() {
    screenshot()
      .then((img) => {
        const filePath = path.join(app.getPath('desktop'), 'screenshot.png');
        writeFile(filePath, img, (err) => {
          if (err) {
            console.error('Error saving screenshot:', err);
            return;
          }

          console.log('📸 Screenshot saved:', filePath);
          sendToOCR(filePath);
        });
      })
      .catch((err) => console.error('Screenshot error:', err));
  }

  function sendToOCR(imagePath) {
    const formData = new FormData();
    formData.append('image', createReadStream(imagePath));

    axios.post('http://127.0.0.1:5001/process-image', formData, {
      headers: formData.getHeaders(),
    })
      .then(response => {
        const { text, ollama_response } = response.data;

        console.log('OCR Extracted:', text);
        console.log('Ollama Response:', ollama_response);

        chatHistory.push({ user: text, ollama: ollama_response });

        mainWindow.webContents.send('update-chat', { user: text, ollama: ollama_response });
      })
      .catch(error => {
        console.error('❌ Error sending to OCR:', error.response ? error.response.data : error.message);
      });
  }

  ipcMain.handle('get-chat-history', () => chatHistory);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
});
