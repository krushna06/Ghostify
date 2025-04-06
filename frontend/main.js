const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const { writeFile, createReadStream, readFileSync, writeFileSync } = require('fs');
const path = require('path');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const FormData = require('form-data');
const ini = require('ini');

let mainWindow;
let chatHistory = [];
let config;

function loadConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'config.ini');
        const configFile = readFileSync(configPath, 'utf-8');
        const parsedConfig = ini.parse(configFile);
        
        if (parsedConfig.model && parsedConfig.model.available_models) {
            try {
                parsedConfig.model.available_models = JSON.parse(parsedConfig.model.available_models);
            } catch (e) {
                console.error('Error parsing available_models:', e);
                parsedConfig.model.available_models = getDefaultModels();
            }
        }
        
        return parsedConfig;
    } catch (error) {
        console.error('Error loading config:', error);
        return {
            appearance: {
                transparency: 0.95,
                theme: 'dark'
            },
            keybinds: {
                toggle_window: 'Control+K',
                take_screenshot: 'Control+Enter',
                show_history: 'Control+H'
            },
            model: {
                current: 'deepseek-coder-v2:16b',
                available_models: getDefaultModels()
            }
        };
    }
}

function getDefaultModels() {
    return {
        "Deepseek": [
            "deepseek-coder-v2:16b",
            "deepseek-coder-v2:236b"
        ],
        "Qwen": [
            "qwen2.5-coder:1.5b",
            "qwen2.5-coder:3b",
            "qwen2.5-coder:14b"
        ],
        "Codellama": [
            "codellama:7b",
            "codellama:13b"
        ]
    };
}

function saveConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'config.ini');
        const configToSave = { ...config };
        
        if (configToSave.model && configToSave.model.available_models) {
            configToSave.model.available_models = JSON.stringify(configToSave.model.available_models);
        }
        
        writeFileSync(configPath, ini.stringify(configToSave));
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

function createWindow() {
    config = loadConfig();
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    mainWindow = new BrowserWindow({
        width: Math.min(800, width * 0.8),
        height: Math.min(600, height * 0.8),
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hidden',
        backgroundColor: '#00000000',
        opacity: parseFloat(config.appearance.transparency)
    });

    mainWindow.loadFile('index.html');
    mainWindow.center();
    
    const windowBounds = mainWindow.getBounds();
    mainWindow.setPosition(width - windowBounds.width - 20, 20);
}

app.whenReady().then(() => {
    createWindow();

    function registerShortcuts() {
        globalShortcut.unregisterAll();

        globalShortcut.register(config.keybinds.toggle_window, () => {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
                mainWindow.webContents.send('window-visibility-changed', false);
            } else {
                mainWindow.show();
                mainWindow.webContents.send('window-visibility-changed', true);
            }
        });

        globalShortcut.register(config.keybinds.take_screenshot, () => {
            takeScreenshot();
        });

        globalShortcut.register(config.keybinds.show_history, () => {
            mainWindow.webContents.send('show-chat-history', chatHistory);
        });
    }

    registerShortcuts();

    function takeScreenshot() {
        mainWindow.webContents.send('screenshot-taken');
        screenshot()
            .then((img) => {
                const filePath = path.join(app.getPath('desktop'), 'screenshot.png');
                writeFile(filePath, img, (err) => {
                    if (err) {
                        console.error('Error saving screenshot:', err);
                        mainWindow.webContents.send('update-chat', { 
                            user: 'Error taking screenshot', 
                            ollama: 'Failed to capture the screen. Please try again.' 
                        });
                        return;
                    }

                    console.log('📸 Screenshot saved:', filePath);
                    sendToOCR(filePath);
                });
            })
            .catch((err) => {
                console.error('Screenshot error:', err);
                mainWindow.webContents.send('update-chat', { 
                    user: 'Error taking screenshot', 
                    ollama: 'Failed to capture the screen. Please try again.' 
                });
            });
    }

    function sendToOCR(imagePath) {
        mainWindow.webContents.send('ocr-processing');
        const formData = new FormData();
        formData.append('image', createReadStream(imagePath));

        axios.post('http://127.0.0.1:5001/process-image', formData, {
            headers: {
                ...formData.getHeaders(),
                'X-Model': config.model.current
            },
            timeout: 30000
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
                mainWindow.webContents.send('update-chat', { 
                    user: 'Error processing image', 
                    ollama: 'Failed to process the screenshot. Please try again.' 
                });
            });
    }

    // IPC handlers for settings
    ipcMain.handle('get-config', () => config);
    
    ipcMain.handle('update-config', (_, newConfig) => {
        config = { ...config, ...newConfig };
        saveConfig();
        
        // Update window transparency
        mainWindow.setOpacity(parseFloat(config.appearance.transparency));
        
        // Re-register shortcuts if keybinds changed
        registerShortcuts();
        
        return config;
    });

    ipcMain.handle('get-chat-history', () => chatHistory);
    ipcMain.handle('toggle-window', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
            mainWindow.webContents.send('window-visibility-changed', false);
        } else {
            mainWindow.show();
            mainWindow.webContents.send('window-visibility-changed', true);
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });
});
