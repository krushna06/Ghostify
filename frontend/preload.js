const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
    loadChatSession: (sessionId) => ipcRenderer.invoke('load-chat-session', sessionId),
    toggleSettings: () => ipcRenderer.invoke('toggle-window'),
    toggleStealthMode: (settings) => ipcRenderer.invoke('toggle-stealth-mode', settings),
    onUpdateChat: (callback) => ipcRenderer.on('update-chat', (_, data) => callback(data)),
    onShowChatHistory: (callback) => ipcRenderer.on('show-chat-history', (_, data) => callback(data)),
    onScreenshotTaken: (callback) => ipcRenderer.on('screenshot-taken', () => callback()),
    onOCRProcessing: (callback) => ipcRenderer.on('ocr-processing', () => callback()),
    onWindowVisibilityChanged: (callback) => ipcRenderer.on('window-visibility-changed', (_, isVisible) => callback(isVisible)),
    onFullscreenChanged: (callback) => ipcRenderer.on('fullscreen-changed', (_, isFullscreen) => callback(isFullscreen)),
    onOpenSettings: (callback) => ipcRenderer.on('open-settings', () => callback())
});