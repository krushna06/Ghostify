const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    toggleWindow: () => ipcRenderer.invoke('toggle-window'),
    getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
    onUpdateChat: (callback) => ipcRenderer.on('update-chat', callback),
    onShowChatHistory: (callback) => ipcRenderer.on('show-chat-history', callback),
    onWindowVisibilityChanged: (callback) => ipcRenderer.on('window-visibility-changed', callback),
    onScreenshotTaken: (callback) => ipcRenderer.on('screenshot-taken', callback),
    onOCRProcessing: (callback) => ipcRenderer.on('ocr-processing', callback)
});
