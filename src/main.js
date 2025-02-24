const { app, BrowserWindow, ipcMain, remote } = require('electron');
const path = require('path');
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}


function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: './crc/loggo.ico',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      preload: path.join(__dirname, './preload.js')
    },
    autoHideMenuBar: true, // Скрываем меню
    frame: true, // Убираем рамку окна
    backgroundColor: '#282c34',
    webSecurity: false,
    enableRemoteModule: true
  });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
    
    globalShortcut.register('CommandOrControl+Shift+i', function () {
      win.webContents.openDevTools();
    });



}

app.whenReady().then(() => {
  createWindow();

});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});