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
        }
    }
};

async function initializeSettings() {
    try {
        config = await window.electronAPI.getConfig();
    } catch (error) {
        console.error('Error loading config:', error);
        config = defaultConfig;
    }
    
    originalConfig = JSON.parse(JSON.stringify(config));
    
    transparencySlider.value = config.appearance.transparency * 100;
    transparencyValue.textContent = `${Math.round(config.appearance.transparency * 100)}%`;
    
    populateModelSelect();
    
    updateKeybindButtons();
}

function updateKeybindButtons() {
    keybindButtons.toggle.textContent = config.keybinds.toggle_window || defaultConfig.keybinds.toggle_window;
    keybindButtons.screenshot.textContent = config.keybinds.take_screenshot || defaultConfig.keybinds.take_screenshot;
    keybindButtons.history.textContent = config.keybinds.show_history || defaultConfig.keybinds.show_history;
}

function populateModelSelect() {
    modelSelect.innerHTML = '';
    
    const models = config.model.available_models;
    Object.entries(models).forEach(([category, modelList]) => {
        const group = document.createElement('optgroup');
        group.label = category;
        
        modelList.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            option.selected = model === config.model.current;
            group.appendChild(option);
        });
        
        modelSelect.appendChild(group);
    });
}

toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    document.getElementById('main-content').classList.toggle('sidebar-open');
});

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('open');
    document.getElementById('main-content').classList.remove('sidebar-open');
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('open');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('open');
});

transparencySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    transparencyValue.textContent = `${value}%`;
    config.appearance.transparency = value / 100;
});

modelSelect.addEventListener('change', (e) => {
    config.model.current = e.target.value;
});

Object.values(keybindButtons).forEach(button => {
    button.addEventListener('click', () => {
        if (isRecordingKeybind) {
            stopRecordingKeybind();
        } else {
            startRecordingKeybind(button);
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (isRecordingKeybind && currentKeybindButton) {
        e.preventDefault();
        
        const keys = [];
        if (e.ctrlKey) keys.push('Control');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        
        if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
            keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
        }
        
        currentKeybindButton.textContent = keys.length > 0 ? keys.join('+') : 'Press keys...';
        
        if (!['Control', 'Alt', 'Shift'].includes(e.key) && (e.ctrlKey || e.altKey || e.shiftKey)) {
            const keybind = keys.join('+');
            
            if (currentKeybindButton === keybindButtons.toggle) {
                config.keybinds.toggle_window = keybind;
            } else if (currentKeybindButton === keybindButtons.screenshot) {
                config.keybinds.take_screenshot = keybind;
            } else if (currentKeybindButton === keybindButtons.history) {
                config.keybinds.show_history = keybind;
            }
            
            stopRecordingKeybind();
        }
    }
});

discardSettingsBtn.addEventListener('click', () => {
    config = JSON.parse(JSON.stringify(originalConfig));
    initializeSettings();
    toggleSettings();
    updateStatus('Changes discarded');
});

function toggleSettings() {
    const isOpening = !settingsModal.classList.contains('open');
    settingsModal.classList.toggle('open');
    
    if (isOpening) {
        originalConfig = JSON.parse(JSON.stringify(config));
    }
}

function updateStatus(message) {
    status.textContent = message;
    setTimeout(() => {
        status.textContent = 'Ready';
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

window.electronAPI.onUpdateChat((event, data) => {
    addChatItem(data, chatList);
});

window.electronAPI.onShowChatHistory((event, history) => {
    chatHistory.innerHTML = '';
    history.forEach(chat => {
        addChatItem(chat, chatHistory);
    });
    
    sidebar.classList.add('open');
    document.getElementById('main-content').classList.add('sidebar-open');
});

window.electronAPI.onWindowVisibilityChanged((event, isVisible) => {
    updateStatus(isVisible ? 'Window visible' : 'Window hidden');
});

window.electronAPI.onScreenshotTaken(() => {
    updateStatus('Processing screenshot...');
});

window.electronAPI.onOCRProcessing(() => {
    updateStatus('Extracting text...');
});

initializeSettings();
  