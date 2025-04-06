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

function getDefaultConfig() {
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
            available_models: {
                "Deepseek": ["deepseek-coder-v2:16b", "deepseek-coder-v2:236b"],
                "Qwen": ["qwen2.5-coder:1.5b", "qwen2.5-coder:3b", "qwen2.5-coder:14b"],
                "Codellama": ["codellama:7b", "codellama:13b"]
            }
        }
    };
}

function loadConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'config.ini');
        const configFile = readFileSync(configPath, 'utf-8');
        const parsedConfig = ini.parse(configFile);
        
        const config = {
            appearance: {
                transparency: parseFloat(parsedConfig.appearance?.transparency || 0.95),
                theme: parsedConfig.appearance?.theme || 'dark'
            },
            keybinds: {
                toggle_window: parsedConfig.keybinds?.toggle_window || 'Control+K',
                take_screenshot: parsedConfig.keybinds?.take_screenshot || 'Control+Enter',
                show_history: parsedConfig.keybinds?.show_history || 'Control+H'
            },
            model: {
                current: parsedConfig.model?.current || 'deepseek-coder-v2:16b',
                available_models: {}
            }
        };
        
        if (parsedConfig.model?.available_models) {
            try {
                config.model.available_models = JSON.parse(parsedConfig.model.available_models);
            } catch (e) {
                config.model.available_models = getDefaultConfig().model.available_models;
            }
        } else {
            config.model.available_models = getDefaultConfig().model.available_models;
        }
        
        return config;
    } catch (error) {
        return getDefaultConfig();
    }
}

function saveConfig() {
    try {
        const configPath = path.join(__dirname, '..', 'config.ini');
        const configToSave = { ...config };
        
        if (configToSave.model && configToSave.model.available_models) {
            configToSave.model.available_models = JSON.stringify(configToSave.model.available_models);
        }
        
        writeFileSync(configPath, ini.stringify(configToSave));
    } catch (error) {}
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
        try {
            globalShortcut.unregisterAll();

            if (!config) {
                config = loadConfig();
            }

            const keybinds = config?.keybinds || getDefaultConfig().keybinds;
            
            if (keybinds.toggle_window) {
                const success = globalShortcut.register(keybinds.toggle_window, () => {
                    if (mainWindow.isVisible()) {
                        mainWindow.hide();
                        mainWindow.webContents.send('window-visibility-changed', false);
                    } else {
                        mainWindow.show();
                        mainWindow.webContents.send('window-visibility-changed', true);
                    }
                });
            }

            if (keybinds.take_screenshot) {
                const success = globalShortcut.register(keybinds.take_screenshot, () => {
                    takeScreenshot();
                });
            }

            if (keybinds.show_history) {
                const success = globalShortcut.register(keybinds.show_history, () => {
                    if (!mainWindow.isVisible()) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                    mainWindow.webContents.send('show-chat-history', []);
                });
            }
        } catch (error) {}
    }

    registerShortcuts();

    function takeScreenshot() {
        mainWindow.webContents.send('screenshot-taken');
        screenshot()
            .then((img) => {
                const filePath = path.join(app.getPath('desktop'), 'screenshot.png');
                writeFile(filePath, img, (err) => {
                    if (err) {
                        mainWindow.webContents.send('update-chat', { 
                            user: 'Error taking screenshot', 
                            ollama: 'Failed to capture the screen. Please try again.' 
                        });
                        return;
                    }
                    sendToOCR(filePath);
                });
            })
            .catch((err) => {
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
                chatHistory.push({ user: text, ollama: ollama_response });
                mainWindow.webContents.send('update-chat', { user: text, ollama: ollama_response });
            })
            .catch(error => {
                mainWindow.webContents.send('update-chat', { 
                    user: 'Error processing image', 
                    ollama: 'Failed to process the screenshot. Please try again.' 
                });
            });
    }

    ipcMain.handle('get-config', () => {
        try {
            const configPath = path.join(__dirname, '..', 'config.ini');
            const configFile = readFileSync(configPath, 'utf-8');
            const parsedConfig = ini.parse(configFile);
            
            const config = {
                appearance: {
                    transparency: parseFloat(parsedConfig.appearance?.transparency || 0.95),
                    theme: parsedConfig.appearance?.theme || 'dark'
                },
                keybinds: {
                    toggle_window: parsedConfig.keybinds?.toggle_window || 'Control+K',
                    take_screenshot: parsedConfig.keybinds?.take_screenshot || 'Control+Enter',
                    show_history: parsedConfig.keybinds?.show_history || 'Control+H'
                },
                model: {
                    current: parsedConfig.model?.current || 'deepseek-coder-v2:16b',
                    available_models: {}
                }
            };
            
            if (parsedConfig.model?.available_models) {
                try {
                    config.model.available_models = JSON.parse(parsedConfig.model.available_models);
                } catch (e) {
                    config.model.available_models = getDefaultConfig().model.available_models;
                }
            } else {
                config.model.available_models = getDefaultConfig().model.available_models;
            }
            
            return config;
        } catch (error) {
            return getDefaultConfig();
        }
    });

    ipcMain.handle('update-config', async (_, newConfig) => {
        try {
            if (!newConfig || typeof newConfig !== 'object') {
                throw new Error('Invalid config object');
            }

            if (!newConfig.appearance || typeof newConfig.appearance !== 'object') {
                throw new Error('Invalid appearance settings');
            }
            if (!newConfig.keybinds || typeof newConfig.keybinds !== 'object') {
                throw new Error('Invalid keybind settings');
            }
            if (!newConfig.model || typeof newConfig.model !== 'object') {
                throw new Error('Invalid model settings');
            }

            const configToSave = {
                appearance: {
                    transparency: newConfig.appearance.transparency?.toString() || '0.95',
                    theme: newConfig.appearance.theme || 'dark'
                },
                keybinds: {
                    toggle_window: newConfig.keybinds.toggle_window || 'Control+K',
                    take_screenshot: newConfig.keybinds.take_screenshot || 'Control+Enter',
                    show_history: newConfig.keybinds.show_history || 'Control+H'
                },
                model: {
                    current: newConfig.model.current || 'deepseek-coder-v2:16b',
                    available_models: JSON.stringify(newConfig.model.available_models || getDefaultConfig().model.available_models)
                }
            };
            
            const configPath = path.join(__dirname, '..', 'config.ini');
            
            const configDir = path.dirname(configPath);
            if (!require('fs').existsSync(configDir)) {
                require('fs').mkdirSync(configDir, { recursive: true });
            }
            
            writeFileSync(configPath, ini.stringify(configToSave));
            
            config = newConfig;
            
            registerShortcuts();
            
            if (mainWindow && typeof newConfig.appearance.transparency === 'number') {
                mainWindow.setOpacity(newConfig.appearance.transparency);
            }
            
            return true;
        } catch (error) {
            throw error;
        }
    });

    ipcMain.handle('get-chat-history', () => {
        return chatHistory || [];
    });

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

    app.on('ready', () => {
        setTimeout(() => {
            registerShortcuts();
        }, 1000);
    });
});
