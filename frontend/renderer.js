const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const discardSettingsBtn = document.getElementById('discard-settings');
const modelSelect = document.getElementById('model-select');
const transparencySlider = document.getElementById('transparency');
const transparencyValue = document.getElementById('transparency-value');
const chatList = document.getElementById('chat-list');
const chatHistory = document.getElementById('chat-history');
const status = document.getElementById('status');

const keybindButtons = {
    toggle: document.getElementById('toggle-window-bind'),
    screenshot: document.getElementById('screenshot-bind'),
    history: document.getElementById('history-bind')
};

let config = null;
let originalConfig = null;
let isRecordingKeybind = false;
let currentKeybindButton = null;

const defaultConfig = {
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

async function initializeSettings() {
    keybindButtons.toggle = document.getElementById('toggle-window-bind');
    keybindButtons.screenshot = document.getElementById('screenshot-bind');
    keybindButtons.history = document.getElementById('history-bind');
    
    try {
        config = await window.electronAPI.getConfig();
        
        if (!config) {
            config = defaultConfig;
        }
        
        if (!config.keybinds) {
            config.keybinds = defaultConfig.keybinds;
        } else {
            if (!config.keybinds.toggle_window) {
                config.keybinds.toggle_window = defaultConfig.keybinds.toggle_window;
            }
            if (!config.keybinds.take_screenshot) {
                config.keybinds.take_screenshot = defaultConfig.keybinds.take_screenshot;
            }
            if (!config.keybinds.show_history) {
                config.keybinds.show_history = defaultConfig.keybinds.show_history;
            }
        }
        
        if (!config.model) {
            config.model = {
                current: 'deepseek-coder-v2:16b',
                available_models: {}
            };
        }
    } catch (error) {
        config = defaultConfig;
    }
    
    originalConfig = JSON.parse(JSON.stringify(config));
    
    if (transparencySlider) {
        transparencySlider.value = (config.appearance?.transparency || 0.95) * 100;
        transparencyValue.textContent = `${Math.round(transparencySlider.value)}%`;
    }
    
    updateKeybindButtons();
    populateModelSelect();
}

function updateKeybindButtons() {
    if (!config || !config.keybinds) {
        return;
    }
    
    if (keybindButtons.toggle) {
        const toggleKeybind = config.keybinds.toggle_window || defaultConfig.keybinds.toggle_window;
        keybindButtons.toggle.textContent = toggleKeybind;
    }
    
    if (keybindButtons.screenshot) {
        const screenshotKeybind = config.keybinds.take_screenshot || defaultConfig.keybinds.take_screenshot;
        keybindButtons.screenshot.textContent = screenshotKeybind;
    }
    
    if (keybindButtons.history) {
        const historyKeybind = config.keybinds.show_history || defaultConfig.keybinds.show_history;
        keybindButtons.history.textContent = historyKeybind;
    }
}

function populateModelSelect() {
    if (!modelSelect) {
        return;
    }
    
    modelSelect.innerHTML = '';
    
    try {
        if (!config || !config.model) {
            return;
        }
        
        const models = config.model.available_models;
        
        if (!models || typeof models !== 'object') {
            return;
        }
        
        const currentModel = config.model.current || '';
        
        Object.entries(models).forEach(([category, modelList]) => {
            if (!Array.isArray(modelList)) {
                return;
            }
            
            const group = document.createElement('optgroup');
            group.label = category;
            
            modelList.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                option.selected = (model === currentModel);
                group.appendChild(option);
            });
            
            modelSelect.appendChild(group);
        });
        
        if (modelSelect.selectedIndex === -1 && modelSelect.options.length > 0) {
            modelSelect.selectedIndex = 0;
            config.model.current = modelSelect.options[0].value;
        }
    } catch (error) {}
}

function startRecordingKeybind(button) {
    isRecordingKeybind = true;
    currentKeybindButton = button;
    button.textContent = 'Press keys...';
    button.classList.add('recording');
}

function stopRecordingKeybind() {
    isRecordingKeybind = false;
    if (currentKeybindButton) {
        currentKeybindButton.classList.remove('recording');
    }
    currentKeybindButton = null;
}

toggleSidebarBtn.addEventListener('click', async () => {
    if (!sidebar) {
        return;
    }
    
    const isOpening = !sidebar.classList.contains('open');
    
    if (isOpening) {
        try {
            const history = await window.electronAPI.getChatHistory();
            
            if (chatHistory) {
                chatHistory.innerHTML = '';
                
                if (Array.isArray(history) && history.length > 0) {
                    history.forEach(item => {
                        addChatItem(item, chatHistory);
                    });
                } else {
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'chat-item';
                    emptyMessage.textContent = 'No chat history yet. Take a screenshot to get started.';
                    chatHistory.appendChild(emptyMessage);
                }
            }
        } catch (error) {
            updateStatus('Failed to load chat history');
        }
    }
    
    sidebar.classList.toggle('open');
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.classList.toggle('sidebar-open');
    }
    
    updateStatus(isOpening ? 'Showing chat history' : 'Hiding chat history');
});

closeSidebarBtn.addEventListener('click', () => {
    if (sidebar) {
        sidebar.classList.remove('open');
        document.getElementById('main-content').classList.remove('sidebar-open');
    }
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('open');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('open');
});

saveSettingsBtn.addEventListener('click', async () => {
    try {
        if (!config) {
            config = { ...defaultConfig };
        }
        
        config.appearance = config.appearance || { ...defaultConfig.appearance };
        config.keybinds = config.keybinds || { ...defaultConfig.keybinds };
        config.model = config.model || { ...defaultConfig.model };
        
        if (transparencySlider) {
            const transparency = parseFloat(transparencySlider.value) / 100;
            config.appearance.transparency = Math.max(0.1, Math.min(1, transparency));
        }
        
        if (!config.keybinds.toggle_window) config.keybinds.toggle_window = defaultConfig.keybinds.toggle_window;
        if (!config.keybinds.take_screenshot) config.keybinds.take_screenshot = defaultConfig.keybinds.take_screenshot;
        if (!config.keybinds.show_history) config.keybinds.show_history = defaultConfig.keybinds.show_history;
        
        if (!config.model.current) config.model.current = defaultConfig.model.current;
        if (!config.model.available_models || typeof config.model.available_models !== 'object') {
            config.model.available_models = { ...defaultConfig.model.available_models };
        }
        
        const success = await window.electronAPI.updateConfig(config);
        
        if (!success) {
            throw new Error('Failed to save settings');
        }
        
        originalConfig = JSON.parse(JSON.stringify(config));
        
        updateKeybindButtons();
        
        updateStatus('Settings saved successfully');
        settingsModal.classList.remove('open');
    } catch (error) {
        updateStatus('Error saving settings: ' + (error.message || 'Unknown error'));
    }
});

transparencySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    transparencyValue.textContent = `${value}%`;
    config.appearance.transparency = value / 100;
});

modelSelect.addEventListener('change', async (e) => {
    const selectedModel = e.target.value;
    if (selectedModel) {
        config.model.current = selectedModel;
        try {
            await window.electronAPI.updateConfig(config);
            updateStatus(`Model changed to: ${selectedModel}`);
        } catch (error) {
            updateStatus('Failed to update model');
        }
    }
});

Object.values(keybindButtons).forEach(button => {
    if (!button) return;
    
    button.addEventListener('click', () => {
        if (isRecordingKeybind) {
            stopRecordingKeybind();
        } else {
            startRecordingKeybind(button);
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (!isRecordingKeybind || !currentKeybindButton) return;
    
    e.preventDefault();
    
    const keys = [];
    if (e.ctrlKey) keys.push('Control');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    
    const specialKeys = {
        'Enter': 'Enter',
        'Escape': 'Escape',
        'Tab': 'Tab',
        'Space': 'Space',
        'ArrowUp': 'ArrowUp',
        'ArrowDown': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft',
        'ArrowRight': 'ArrowRight',
        'Home': 'Home',
        'End': 'End',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
        'Insert': 'Insert',
        'Delete': 'Delete',
        'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
        'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
        'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12'
    };
    
    if (specialKeys[e.key]) {
        keys.push(specialKeys[e.key]);
    } else if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
        keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }
    
    if (keys.length > 0) {
        const keybind = keys.join('+');
        currentKeybindButton.textContent = keybind;
        
        if (!['Control', 'Alt', 'Shift'].includes(e.key) && (e.ctrlKey || e.altKey || e.shiftKey)) {
            if (currentKeybindButton === keybindButtons.toggle) {
                config.keybinds.toggle_window = keybind;
            } else if (currentKeybindButton === keybindButtons.screenshot) {
                config.keybinds.take_screenshot = keybind;
            } else if (currentKeybindButton === keybindButtons.history) {
                config.keybinds.show_history = keybind;
            }
            
            saveKeybindChanges(keybind);
            
            stopRecordingKeybind();
        }
    }
});

async function saveKeybindChanges(keybind) {
    try {
        const success = await window.electronAPI.updateConfig(config);
        if (success) {
            updateStatus(`Keybind set to: ${keybind}`);
        } else {
            throw new Error('Failed to save keybind');
        }
    } catch (error) {
        updateStatus('Failed to save keybind');
    }
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'h' && !isRecordingKeybind) {
        e.preventDefault();
        
        if (toggleSidebarBtn) {
            toggleSidebarBtn.click();
        }
    }
});

discardSettingsBtn.addEventListener('click', () => {
    config = JSON.parse(JSON.stringify(originalConfig));
    initializeSettings();
    settingsModal.classList.remove('open');
    updateStatus('Changes discarded');
});

function updateStatus(message) {
    if (!status) return;
    status.textContent = message;
    setTimeout(() => {
        if (status) {
            status.textContent = 'Ready';
        }
    }, 3000);
}

function addChatItem(data, container) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    
    const content = document.createElement('div');
    content.className = 'content';
    content.textContent = data.user;
    
    const ollama = document.createElement('div');
    ollama.className = 'ollama';
    ollama.textContent = data.ollama;
    
    chatItem.appendChild(timestamp);
    chatItem.appendChild(content);
    chatItem.appendChild(ollama);
    
    container.appendChild(chatItem);
    container.scrollTop = container.scrollHeight;
}

document.addEventListener('DOMContentLoaded', initializeSettings);

window.electronAPI.onUpdateChat((data) => {
    addChatItem(data, chatList);
});

window.electronAPI.onShowChatHistory((history) => {
    if (toggleSidebarBtn) {
        toggleSidebarBtn.click();
    }
});

window.electronAPI.onWindowVisibilityChanged((isVisible) => {
    document.body.classList.toggle('window-hidden', !isVisible);
});

window.electronAPI.onScreenshotTaken(() => {
    updateStatus('Taking screenshot...');
});

window.electronAPI.onOCRProcessing(() => {
    updateStatus('Processing image...');
});
  