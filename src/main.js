import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

let tray = null;
let isQuitting = false;

function getTrayIcon() {
 // In dev use file from src/, in prod — from build resources
 const devIcon = path.resolve(process.cwd(), 'src', 'loggo.ico');
 const prodIcon = path.join(process.resourcesPath || process.cwd(), 'loggo.ico');
 return nativeImage.createFromPath(app.isPackaged ? prodIcon : devIcon);
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
  icon: './crc/loggo.ico',
  icon: getTrayIcon(),
    autoHideMenuBar: true, // Hide the menu bar
    backgroundColor: '#282c34',
    webSecurity: false,
    enableRemoteModule: true, // ???????
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

 // Tray
 tray = new Tray(getTrayIcon());
 const contextMenu = Menu.buildFromTemplate([
   { label: 'Show', click: () => { mainWindow.show(); mainWindow.focus(); } },
   { type: 'separator' },
   { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
 ]);
 tray.setToolTip('JS Runtime');
 tray.setContextMenu(contextMenu);
 tray.on('click', () => {
   if (mainWindow.isVisible()) mainWindow.hide();
   else { mainWindow.show(); mainWindow.focus(); }
 });

 // Minimize to tray on minimize
 mainWindow.on('minimize', (e) => {
   e.preventDefault();
   mainWindow.hide();
 });
 
 // Do not close on X — hide to tray instead
 mainWindow.on('close', (e) => {
   if (!isQuitting) {
     e.preventDefault();
     mainWindow.hide();
   }
 });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools. Ctrl+Shift+I
  globalShortcut.register('CommandOrControl+Shift+i', function () {
    mainWindow.webContents.openDevTools();
  });
};
 
app.whenReady().then(() => {
  createWindow();
 app.on('before-quit', () => { isQuitting = true; });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
 
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
  app.quit();
  // On Windows keep the app in the tray
  if (!isQuitting) return;
  app.quit();
  }
});