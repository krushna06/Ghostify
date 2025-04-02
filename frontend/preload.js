const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  toggleWindow: () => ipcRenderer.send('toggle-window'),

  onUpdateChat: (callback) => ipcRenderer.on('update-chat', (_, chat) => callback(chat)),
  onShowChatHistory: (callback) => ipcRenderer.on('show-chat-history', (_, history) => callback(history)),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history')
});
