document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const chatList = document.getElementById('chat-list');
    const chatHistory = document.getElementById('chat-history');
    const statusElement = document.getElementById('status');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    const discardSettingsBtn = document.getElementById('discard-settings');
    
    // Settings elements
    const transparencySlider = document.getElementById('transparency');
    const transparencyValue = document.getElementById('transparency-value');
    const modelSelect = document.getElementById('model-select');
    const saveSettingsBtn = document.getElementById('save-settings');
    const keybindButtons = {
        toggle: document.getElementById('toggle-window-bind'),
        screenshot: document.getElementById('screenshot-bind'),
        history: document.getElementById('history-bind')
    };

    // State
    let isSidebarOpen = false;
    let isRecordingKeybind = false;
    let currentKeybindButton = null;
    let config = null;
    let originalConfig = null;

    // Default config
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

    // Initialize settings
    async function initializeSettings() {
        try {
            config = await window.electronAPI.getConfig();
        } catch (error) {
            console.error('Error loading config:', error);
            config = defaultConfig;
        }
        
        // Store original config
        originalConfig = JSON.parse(JSON.stringify(config));
        
        // Set transparency
        transparencySlider.value = config.appearance.transparency * 100;
        transparencyValue.textContent = `${Math.round(config.appearance.transparency * 100)}%`;
        
        // Set model
        populateModelSelect();
        
        // Set keybinds
        updateKeybindButtons();
    }

    function updateKeybindButtons() {
        keybindButtons.toggle.textContent = config.keybinds.toggle_window || defaultConfig.keybinds.toggle_window;
        keybindButtons.screenshot.textContent = config.keybinds.take_screenshot || defaultConfig.keybinds.take_screenshot;
        keybindButtons.history.textContent = config.keybinds.show_history || defaultConfig.keybinds.show_history;
    }

    function populateModelSelect() {
        modelSelect.innerHTML = ''; // Clear existing options
        
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

    initializeSettings();

    function updateStatus(message, isError = false) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? 'var(--error-color)' : '#8b949e';
    }

    function createChatItem(chat, container) {
        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-item');
        
        const timestamp = new Date().toLocaleTimeString();
        
        // Check if the Ollama response contains an error message
        const isOllamaError = chat.ollama && (
            chat.ollama.includes('Failed to connect to Ollama') || 
            chat.ollama.includes('Error:') ||
            chat.ollama.includes('No connection could be made')
        );
        
        if (isOllamaError) {
            chatItem.classList.add('error');
        }
        
        chatItem.innerHTML = `
            <div class="timestamp">${timestamp}</div>
            <div class="content">${chat.user}</div>
            <div class="ollama">${chat.ollama}</div>
        `;
        
        container.appendChild(chatItem);
        container.scrollTop = container.scrollHeight;
    }

    function updateChat(chat) {
        createChatItem(chat, chatList);
        createChatItem(chat, chatHistory);
        
        if (chat.ollama && chat.ollama.includes('Error')) {
            updateStatus('Error processing request', true);
        } else {
            updateStatus('New message received');
        }
    }

    function showChatHistory(history) {
        chatList.innerHTML = '';
        chatHistory.innerHTML = '';
        
        if (history.length === 0) {
            const emptyMessage = '<div class="chat-item">No history yet. Take a screenshot to get started!</div>';
            chatList.innerHTML = emptyMessage;
            chatHistory.innerHTML = emptyMessage;
            return;
        }
        
        history.forEach(chat => {
            createChatItem(chat, chatList);
            createChatItem(chat, chatHistory);
        });
        
        updateStatus('History loaded');
    }

    // Settings handlers
    transparencySlider.addEventListener('input', (e) => {
        const value = e.target.value;
        transparencyValue.textContent = `${value}%`;
    });

    // Keybind recording
    function startRecordingKeybind(button) {
        if (currentKeybindButton) {
            currentKeybindButton.classList.remove('recording');
        }
        isRecordingKeybind = true;
        currentKeybindButton = button;
        button.classList.add('recording');
        button.textContent = 'Press keys...';
        
        // Store original value
        button.dataset.originalValue = button.textContent;
    }

    function stopRecordingKeybind() {
        isRecordingKeybind = false;
        if (currentKeybindButton) {
            currentKeybindButton.classList.remove('recording');
        }
        currentKeybindButton = null;
    }

    // Handle keybind recording
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
            
            // Show real-time preview of the key combination
            if (!['Control', 'Alt', 'Shift'].includes(e.key)) {
                keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
            }
            
            // Always show current combination
            currentKeybindButton.textContent = keys.length > 0 ? keys.join('+') : 'Press keys...';
            
            // Only complete if we have a modifier and a non-modifier key
            if (!['Control', 'Alt', 'Shift'].includes(e.key) && (e.ctrlKey || e.altKey || e.shiftKey)) {
                const keybind = keys.join('+');
                
                // Update config based on which button was clicked
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

    // Handle discard changes
    discardSettingsBtn.addEventListener('click', () => {
        // Restore original config
        config = JSON.parse(JSON.stringify(originalConfig));
        
        // Reinitialize settings with original values
        initializeSettings();
        
        // Close modal
        toggleSettings();
        updateStatus('Changes discarded');
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', async () => {
        const newConfig = {
            appearance: {
                ...config.appearance,
                transparency: transparencySlider.value / 100
            },
            keybinds: {
                toggle_window: keybindButtons.toggle.textContent,
                take_screenshot: keybindButtons.screenshot.textContent,
                show_history: keybindButtons.history.textContent
            },
            model: {
                ...config.model,
                current: modelSelect.value
            }
        };

        config = await window.electronAPI.updateConfig(newConfig);
        toggleSettings();
        updateStatus('Settings saved');
    });

    // Sidebar Toggle
    function toggleSidebar() {
        isSidebarOpen = !isSidebarOpen;
        sidebar.classList.toggle('open', isSidebarOpen);
        mainContent.classList.toggle('sidebar-open', isSidebarOpen);
    }

    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);

    // Settings Modal
    function toggleSettings() {
        const isOpening = !settingsModal.classList.contains('open');
        settingsModal.classList.toggle('open');
        
        // Store original config when opening
        if (isOpening) {
            originalConfig = JSON.parse(JSON.stringify(config));
        }
    }

    settingsBtn.addEventListener('click', toggleSettings);
    closeSettingsBtn.addEventListener('click', toggleSettings);

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            toggleSettings();
        }
    });

    // Event Listeners
    window.electronAPI.onWindowVisibilityChanged((isVisible) => {
        updateStatus(isVisible ? 'Window visible' : 'Window hidden');
    });

    window.electronAPI.onScreenshotTaken(() => {
        updateStatus('Processing screenshot...');
    });

    window.electronAPI.onOCRProcessing(() => {
        updateStatus('Extracting text...');
    });

    window.electronAPI.onAIProcessing(() => {
        updateStatus('Getting AI response...');
    });

    window.electronAPI.onUpdateChat(updateChat);
    window.electronAPI.onShowChatHistory(showChatHistory);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Close sidebar with Escape key
        if (e.key === 'Escape') {
            if (settingsModal.classList.contains('open')) {
                toggleSettings();
            } else if (isSidebarOpen) {
                toggleSidebar();
            }
        }
    });

    // Initial status
    updateStatus('Ready');
});
  