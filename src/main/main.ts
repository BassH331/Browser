import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      webviewTag: true
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  const isDev = process.argv.includes('--dev');
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for browser functionality
ipcMain.handle('navigate-to', async (event, url: string) => {
  return { success: true, url };
});

ipcMain.handle('go-back', async (event) => {
  return { success: true };
});

ipcMain.handle('go-forward', async (event) => {
  return { success: true };
});

ipcMain.handle('reload', async (event) => {
  return { success: true };
});

ipcMain.handle('get-bookmarks', async (event) => {
  // In a real implementation, this would read from a file or database
  return [];
});

ipcMain.handle('add-bookmark', async (event, bookmark: { title: string; url: string }) => {
  // In a real implementation, this would save to a file or database
  return { success: true };
});

ipcMain.handle('remove-bookmark', async (event, url: string) => {
  // In a real implementation, this would remove from a file or database
  return { success: true };
});
