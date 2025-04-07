const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config) => ipcRenderer.invoke('update-config', config),
    toggleWindow: () => ipcRenderer.invoke('toggle-window'),
    getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
    onUpdateChat: (callback) => {
        ipcRenderer.on('update-chat', (_, data) => callback(data));
        return () => ipcRenderer.removeListener('update-chat', callback);
    },
    onShowChatHistory: (callback) => {
        ipcRenderer.on('show-chat-history', (_, data) => callback(data));
        return () => ipcRenderer.removeListener('show-chat-history', callback);
    },
    onWindowVisibilityChanged: (callback) => {
        ipcRenderer.on('window-visibility-changed', (_, data) => callback(data));
        return () => ipcRenderer.removeListener('window-visibility-changed', callback);
    },
    onScreenshotTaken: (callback) => {
        ipcRenderer.on('screenshot-taken', (_, data) => callback(data));
        return () => ipcRenderer.removeListener('screenshot-taken', callback);
    },
    onOCRProcessing: (callback) => {
        ipcRenderer.on('ocr-processing', (_, data) => callback(data));
        return () => ipcRenderer.removeListener('ocr-processing', callback);
    }
});
