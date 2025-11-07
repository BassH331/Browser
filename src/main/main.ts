import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import log from 'electron-log';
import { autoUpdater, type ProgressInfo, type UpdateDownloadedEvent, type UpdateInfo } from 'electron-updater';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { URL } from 'url';

const MODERN_CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const HOME_DIR = process.env.HOME ?? process.env.USERPROFILE ?? tmpdir();
const USER_DATA_DIR = path.join(HOME_DIR, '.v3x-browser');
const CACHE_DIR = path.join(USER_DATA_DIR, 'cache');

for (const dir of [USER_DATA_DIR, CACHE_DIR]) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.warn('Failed to ensure directory exists', { dir, error });
  }
}

app.setPath('userData', USER_DATA_DIR);
app.setPath('cache', CACHE_DIR);
app.commandLine.appendSwitch('disk-cache-dir', CACHE_DIR);
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

const safeParseHost = (input: string): string | null => {
  try {
    const parsed = new URL(input);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

const createWindow = (): void => {
  log.info('Creating main browser window');
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

  mainWindow.webContents.setUserAgent(MODERN_CHROME_UA);

  const isDev = process.argv.includes('--dev');
  
  if (isDev) {
    log.info('Loading renderer from Vite dev server http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000').catch((error: Error) => {
      log.error('Failed to load dev server URL', error);
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Load the advanced professional browser
    const entryFile = path.join(__dirname, '../../advanced_browser.html');
    log.info('Loading bundled renderer file', entryFile);
    mainWindow.loadFile(entryFile).catch((error: Error) => {
      log.error('Failed to load bundled renderer', error);
    });
  }

  const allowedWindowProtocols = new Set(['http:', 'https:']);
  const externalProtocolAllowlist = new Set([
    'mailto:',
    'vscode:',
    'vscode-insiders:',
    'code:',
    'code-insiders:'
  ]);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (allowedWindowProtocols.has(parsed.protocol) || externalProtocolAllowlist.has(parsed.protocol)) {
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
    log.debug('will-navigate', { url });
    try {
      const parsed = new URL(url);
      const isAppFile = parsed.protocol === 'file:' && url.startsWith(`file://${path.join(__dirname).replace(/\\/g, '/')}`);
      const isAllowed = allowedWindowProtocols.has(parsed.protocol);
      const isAllowedExternal = externalProtocolAllowlist.has(parsed.protocol);
      if (!isAppFile && !isAllowed) {
        if (isAllowedExternal) {
          log.info('Opening external protocol navigation', { url });
          shell.openExternal(url).catch((error: Error) => {
            log.error('Failed to open external protocol URL', { url, error });
          });
        } else {
          console.warn(`Blocked navigation to ${url}`);
        }
        event.preventDefault();
      }
    } catch (error) {
      console.warn('Failed to parse URL during will-navigate:', error);
      event.preventDefault();
    }
  });

  mainWindow.once('ready-to-show', () => {
    log.info('Main window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    log.info('Main window closed');
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  session.defaultSession.setUserAgent(MODERN_CHROME_UA);

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

  const trustedOrigins = new Map<string, Set<string>>([
    ['gizmo.ai', new Set(['geolocation', 'notifications'])]
  ]);

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const requestingUrl = webContents.getURL();
    const host = safeParseHost(requestingUrl);
    const trustedPermissions = host ? trustedOrigins.get(host) : undefined;

    log.warn('Permission request intercepted', { permission, requestingUrl, host });

    if (permission === 'clipboard-read') {
      log.info('Permission allowed (clipboard-read)', { requestingUrl });
      callback(true);
      return;
    }

    if (trustedPermissions && trustedPermissions.has(permission)) {
      log.info('Permission allowed for trusted origin', { permission, host });
      callback(true);
      return;
    }

    log.warn('Permission denied', { permission, requestingUrl });
    callback(false);
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = details.responseHeaders || {};

    try {
      const requestUrl = new URL(details.url);
      if (requestUrl.protocol === 'file:') {
        const cspKey = Object.keys(headers).find((key) => key.toLowerCase() === 'content-security-policy');
        if (!cspKey) {
          log.info('Injecting fallback CSP for local asset', { url: details.url });
          headers['Content-Security-Policy'] = [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https://* http://*; connect-src 'self' https://* http://*; child-src 'self' https://* http://*; frame-src 'self' https://* http://*; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
          ];
        }
      }
    } catch (error) {
      log.warn('Failed to evaluate CSP injection target', { url: details.url, error });
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
      log.info('WebView attachment intercepted', { src: params.src, preload: webPreferences.preload });
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;
      delete webPreferences.preload;

      if (params.src && !/^https?:\/\//i.test(params.src)) {
        log.warn('Blocked webview attachment to non-http(s) source', { src: params.src });
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
ipcMain.handle('navigate-to', async (_event, url: string) => {
  log.info('IPC navigate-to request', { url });
  return { success: true, url };
});

ipcMain.handle('go-back', async () => {
  log.info('IPC go-back request received');
  return { success: true };
});

ipcMain.handle('go-forward', async () => {
  log.info('IPC go-forward request received');
  return { success: true };
});

ipcMain.handle('reload', async () => {
  log.info('IPC reload request received');
  return { success: true };
});

ipcMain.handle('get-bookmarks', async () => {
  log.info('IPC get-bookmarks request received');
  // In a real implementation, this would read from a file or database
  return [];
});

ipcMain.handle('add-bookmark', async (_event, bookmark: { title: string; url: string }) => {
  log.info('IPC add-bookmark request', bookmark);
  // In a real implementation, this would save to a file or database
  return { success: true };
});

ipcMain.handle('remove-bookmark', async (_event, url: string) => {
  log.info('IPC remove-bookmark request', { url });
  // In a real implementation, this would remove from a file or database
  return { success: true };
});

ipcMain.on('renderer-log', (_event, payload: { source: string; event: string; details?: unknown }) => {
  const { source, event, details } = payload;
  log.debug(`[Renderer] ${event}`, { source, details });
});
