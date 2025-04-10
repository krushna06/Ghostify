const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const { writeFile, createReadStream, readFileSync, writeFileSync, existsSync } = require('fs');
const path = require('path');
const screenshot = require('screenshot-desktop');
const axios = require('axios');
const FormData = require('form-data');
const ini = require('ini');

let mainWindow;
let chatHistory = [];
let config;
let isFullscreen = false;

const stealthConfig = {
    hideFromTaskManager: true,
    hideFromScreenCapture: true,
    hideFromAltTab: true
};

function getDefaultConfig() {
    return {
        appearance: {
            transparency: 0.95,
            textTransparency: 1.0,
            theme: 'dark'
        },
        keybinds: {
            toggle_window: 'Control+K',
            take_screenshot: 'Control+Enter',
            toggle_fullscreen: 'Control+F12',
            open_settings: 'Control+Alt+S'
        },
        model: {
            current: 'deepseek-coder-v2:16b',
            available_models: {
                "Deepseek": ["deepseek-coder-v2:16b", "deepseek-coder-v2:236b"],
                "Qwen": ["qwen2.5-coder:1.5b", "qwen2.5-coder:3b", "qwen2.5-coder:14b"],
                "Codellama": ["codellama:7b", "codellama:13b"],
                "Others": ["qwen:15b", "falcon3:7b"],
                "gemini": ["gemma3:4b"]
            }
        },
        ollama: {
            base_url: 'http://localhost:11434'
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
                textTransparency: parseFloat(parsedConfig.appearance?.textTransparency || 1.0),
                theme: parsedConfig.appearance?.theme || 'dark'
            },
            keybinds: {
                toggle_window: parsedConfig.keybinds?.toggle_window || 'Control+K',
                take_screenshot: parsedConfig.keybinds?.take_screenshot || 'Control+Enter',
                toggle_fullscreen: parsedConfig.keybinds?.toggle_fullscreen || 'Control+F12',
                open_settings: parsedConfig.keybinds?.open_settings || 'Control+Alt+S'
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

function getChatHistoryPath() {
    const appDataPath = app.getPath('appData');
    const ghostifyPath = path.join(appDataPath, 'Ghostify');
    if (!existsSync(ghostifyPath)) {
        require('fs').mkdirSync(ghostifyPath, { recursive: true });
    }
    const historyPath = path.join(ghostifyPath, 'chat_history.json');
    console.log('Chat history path:', historyPath);
    return historyPath;
}

function loadChatHistory() {
    try {
        const historyPath = getChatHistoryPath();
        console.log('Loading chat history from:', historyPath);
        if (existsSync(historyPath)) {
            const data = readFileSync(historyPath, 'utf-8');
            chatHistory = JSON.parse(data);
            console.log('Loaded chat history:', chatHistory);
        } else {
            console.log('No existing chat history file found');
            chatHistory = [];
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        chatHistory = [];
    }
}

function saveChatHistory() {
    try {
        const historyPath = getChatHistoryPath();
        console.log('Saving chat history to:', historyPath);
        console.log('Chat history content:', JSON.stringify(chatHistory, null, 2));
        writeFileSync(historyPath, JSON.stringify(chatHistory, null, 2));
        console.log('Chat history saved successfully');
    } catch (error) {
        console.error('Error saving chat history:', error);
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
        resizable: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        titleBarStyle: 'hidden',
        backgroundColor: '#00000000',
        opacity: parseFloat(config.appearance.transparency),
        skipTaskbar: stealthConfig.hideFromTaskManager,
        show: false,
        type: 'toolbar'
    });

    if (stealthConfig.hideFromScreenCapture) {
        mainWindow.setContentProtection(true);
    }

    mainWindow.loadFile('index.html');
    mainWindow.center();
    
    const windowBounds = mainWindow.getBounds();
    mainWindow.setPosition(width - windowBounds.width - 20, 20);

    if (stealthConfig.hideFromAltTab) {
        mainWindow.setSkipTaskbar(true);
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
    }

    setTimeout(() => {
        mainWindow.show();
    }, 100);
}

function toggleFullscreen() {
    if (!mainWindow) return;
    
    isFullscreen = !isFullscreen;
    
    if (isFullscreen) {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        
        mainWindow.setBounds({ x: 0, y: 0, width, height });
        
        mainWindow.setIgnoreMouseEvents(true);
        
        mainWindow.webContents.send('fullscreen-changed', true);
    } else {
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        const windowWidth = Math.min(800, width * 0.8);
        const windowHeight = Math.min(600, height * 0.8);
        
        mainWindow.setBounds({
            x: width - windowWidth - 20,
            y: 20,
            width: windowWidth,
            height: windowHeight
        });
        
        mainWindow.setIgnoreMouseEvents(false);
        
        mainWindow.webContents.send('fullscreen-changed', false);
    }
}

app.whenReady().then(() => {
    loadChatHistory();
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

            if (keybinds.toggle_fullscreen) {
                const success = globalShortcut.register(keybinds.toggle_fullscreen, () => {
                    toggleFullscreen();
                });
            }
            
            if (keybinds.open_settings) {
                const success = globalShortcut.register(keybinds.open_settings, () => {
                    if (!mainWindow.isVisible()) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                    mainWindow.webContents.send('open-settings', []);
                });
            }
        } catch (error) {
            console.error('Error registering shortcuts:', error);
        }
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

    function getPythonPath() {
        if (process.env.NODE_ENV === 'development') {
            return path.join(__dirname, '..', 'backend', 'ocr.py');
        } else {
            return path.join(process.resourcesPath, 'backend', 'ocr.py');
        }
    }

    function sendToOCR(imagePath) {
        mainWindow.webContents.send('ocr-processing');
        const formData = new FormData();
        formData.append('image', createReadStream(imagePath));

        const ollamaUrl = config.ollama?.base_url || 'http://localhost:11434';
        
        axios.post('http://127.0.0.1:5001/process-image', formData, {
            headers: {
                ...formData.getHeaders(),
                'X-Model': config.model.current,
                'X-Ollama-Url': ollamaUrl
            },
            timeout: 90000000
        })
            .then(response => {
                const { text, ollama_response } = response.data;
                const sessionId = Date.now().toString();
                const chatItem = { 
                    user: text, 
                    ollama: ollama_response,
                    timestamp: new Date().toISOString(),
                    sessionId: sessionId
                };
                
                if (!Array.isArray(chatHistory)) {
                    chatHistory = [];
                }
                
                chatHistory.push(chatItem);
                saveChatHistory();
                
                mainWindow.webContents.send('update-chat', chatItem);
                mainWindow.webContents.send('show-chat-history', chatHistory);
            })
            .catch(error => {
                const sessionId = Date.now().toString();
                const errorItem = { 
                    user: 'Error processing image', 
                    ollama: 'Failed to process the screenshot. Please try again.',
                    timestamp: new Date().toISOString(),
                    sessionId: sessionId
                };
                
                if (!Array.isArray(chatHistory)) {
                    chatHistory = [];
                }
                
                chatHistory.push(errorItem);
                saveChatHistory();
                
                mainWindow.webContents.send('update-chat', errorItem);
                mainWindow.webContents.send('show-chat-history', chatHistory);
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
                    textTransparency: parseFloat(parsedConfig.appearance?.textTransparency || 1.0),
                    theme: parsedConfig.appearance?.theme || 'dark'
                },
                keybinds: {
                    toggle_window: parsedConfig.keybinds?.toggle_window || 'Control+K',
                    take_screenshot: parsedConfig.keybinds?.take_screenshot || 'Control+Enter',
                    toggle_fullscreen: parsedConfig.keybinds?.toggle_fullscreen || 'Control+F12',
                    open_settings: parsedConfig.keybinds?.open_settings || 'Control+Alt+S'
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
                    textTransparency: newConfig.appearance.textTransparency?.toString() || '1.0',
                    theme: newConfig.appearance.theme || 'dark'
                },
                keybinds: {
                    toggle_window: newConfig.keybinds.toggle_window || 'Control+K',
                    take_screenshot: newConfig.keybinds.take_screenshot || 'Control+Enter',
                    toggle_fullscreen: newConfig.keybinds.toggle_fullscreen || 'Control+F12',
                    open_settings: newConfig.keybinds.open_settings || 'Control+Alt+S'
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

    ipcMain.handle('load-chat-session', async (_, sessionId) => {
        try {
            if (!Array.isArray(chatHistory)) {
                return { 
                    id: sessionId,
                    timestamp: new Date().toISOString(),
                    messages: []
                };
            }
            
            const sessionMessages = chatHistory.filter(msg => msg.sessionId === sessionId);
            
            return {
                id: sessionId,
                timestamp: new Date(sessionId).toISOString(),
                messages: sessionMessages
            };
        } catch (error) {
            console.error('Error loading chat session:', error);
            return { 
                id: sessionId,
                timestamp: new Date().toISOString(),
                messages: [] 
            };
        }
    });

    ipcMain.handle('toggle-stealth-mode', (_, settings) => {
        stealthConfig.hideFromTaskManager = settings.hideFromTaskManager ?? stealthConfig.hideFromTaskManager;
        stealthConfig.hideFromScreenCapture = settings.hideFromScreenCapture ?? stealthConfig.hideFromScreenCapture;
        stealthConfig.hideFromAltTab = settings.hideFromAltTab ?? stealthConfig.hideFromAltTab;

        if (mainWindow) {
            mainWindow.setSkipTaskbar(stealthConfig.hideFromTaskManager);
            mainWindow.setContentProtection(stealthConfig.hideFromScreenCapture);
            
            if (stealthConfig.hideFromAltTab) {
                mainWindow.setSkipTaskbar(true);
                mainWindow.setAlwaysOnTop(true, 'screen-saver');
            } else {
                mainWindow.setSkipTaskbar(false);
                mainWindow.setAlwaysOnTop(true);
            }
        }
        
        return true;
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
        saveChatHistory();
    });

    app.on('ready', () => {
        setTimeout(() => {
            registerShortcuts();
        }, 1000);
    });
});
