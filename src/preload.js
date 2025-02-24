const { contextBridge, ipcRenderer } = require('electron');
console.log("preload.js loaded");
// contextBridge.exposeBridge('electronAPI', {
//   minimize: () => ipcRenderer.send('window:minimize'),
//   maximize: () => ipcRenderer.send('window:maximize'),
//   unmaximize: () => ipcRenderer.send('window:unmaximize'),
//   close: () => ipcRenderer.send('window:close'),
//   isMaximized: () => ipcRenderer.invoke('window:isMaximized')
// });

try {
    const { contextBridge, ipcRenderer } = require('electron');
  
    contextBridge.exposeInMainWorld('api', {
      close: () => ipcRenderer.send('window:close')
    });
  } catch (e) {
    console.error("Error in preload.js:", e);
  }

