import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import log from 'electron-log';
import { autoUpdater, type ProgressInfo, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater';
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
      webSecurity: true,
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
    // Load the advanced professional browser
    mainWindow.loadFile(path.join(__dirname, '../../advanced_browser.html'));
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  const allowedWindowProtocols = new Set(['http:', 'https:']);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (allowedWindowProtocols.has(parsed.protocol)) {
        shell.openExternal(url);
      } else {
        console.warn(`Blocked window open to disallowed protocol: ${url}`);
      }
    } catch (error) {
      console.warn('Failed to parse URL for window open handler:', error);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url);
      const isAppFile = parsed.protocol === 'file:' && url.startsWith(`file://${path.join(__dirname).replace(/\\/g, '/')}`);
      if (!isAppFile && !allowedWindowProtocols.has(parsed.protocol)) {
        console.warn(`Blocked navigation to ${url}`);
        event.preventDefault();
      }
    } catch (error) {
      console.warn('Failed to parse URL during will-navigate:', error);
      event.preventDefault();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  log.transports.file.level = 'info';
  log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
  autoUpdater.logger = log as unknown as Console;

  autoUpdater.on('checking-for-update', () => log.info('Checking for update...'));
  autoUpdater.on('update-available', (info: UpdateInfo) => log.info('Update available:', info.version));
  autoUpdater.on('update-not-available', () => log.info('No updates available'));
  autoUpdater.on('error', (error: Error) => log.error('Auto update error:', error));
  autoUpdater.on('download-progress', (progress: ProgressInfo) => log.info('Download progress:', progress.percent.toFixed(2) + '%'));
  autoUpdater.on('update-downloaded', () => log.info('Update downloaded. Will install on quit.'));

  createWindow();

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = new Set(['clipboard-read']);
    if (allowedPermissions.has(permission)) {
      callback(true);
    } else {
      console.warn(`Blocked permission request for: ${permission}`);
      callback(false);
    }
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};
    const cspKey = Object.keys(headers).find((key) => key.toLowerCase() === 'content-security-policy');
    if (!cspKey) {
      headers['Content-Security-Policy'] = [
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https://* http://*; connect-src 'self' https://* http://*; child-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
      ];
    }

    callback({
      responseHeaders: headers
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('web-contents-created', (_event, contents) => {
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      delete webPreferences.preload;

      if (params.src && !/^https?:\/\//i.test(params.src)) {
        log.warn(`Blocked webview attachment to ${params.src}`);
        event.preventDefault();
      }
    });
  });

  if (app.isPackaged) {
    setImmediate(() => {
      autoUpdater.checkForUpdatesAndNotify().catch((error: Error) => {
        log.error('Failed to check for updates:', error);
      });
    });
  } else {
    log.info('Skipping auto-update checks in development mode');
  }
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
