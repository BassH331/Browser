"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_log_1 = __importDefault(require("electron-log"));
const electron_updater_1 = require("electron-updater");
const path = __importStar(require("path"));
const url_1 = require("url");
let mainWindow = null;
const safeParseHost = (input) => {
    try {
        const parsed = new url_1.URL(input);
        return parsed.hostname.replace(/^www\./, '');
    }
    catch {
        return null;
    }
};
const createWindow = () => {
    electron_log_1.default.info('Creating main browser window');
    mainWindow = new electron_1.BrowserWindow({
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
        electron_log_1.default.info('Loading renderer from Vite dev server http://localhost:3000');
        mainWindow.loadURL('http://localhost:3000').catch((error) => {
            electron_log_1.default.error('Failed to load dev server URL', error);
        });
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        // Load the advanced professional browser
        const entryFile = path.join(__dirname, '../../advanced_browser.html');
        electron_log_1.default.info('Loading bundled renderer file', entryFile);
        mainWindow.loadFile(entryFile).catch((error) => {
            electron_log_1.default.error('Failed to load bundled renderer', error);
        });
    }
    const allowedWindowProtocols = new Set(['http:', 'https:']);
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        try {
            const parsed = new url_1.URL(url);
            if (allowedWindowProtocols.has(parsed.protocol)) {
                electron_1.shell.openExternal(url);
            }
            else {
                console.warn(`Blocked window open to disallowed protocol: ${url}`);
            }
        }
        catch (error) {
            console.warn('Failed to parse URL for window open handler:', error);
        }
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        electron_log_1.default.debug('will-navigate', { url });
        try {
            const parsed = new url_1.URL(url);
            const isAppFile = parsed.protocol === 'file:' && url.startsWith(`file://${path.join(__dirname).replace(/\\/g, '/')}`);
            if (!isAppFile && !allowedWindowProtocols.has(parsed.protocol)) {
                console.warn(`Blocked navigation to ${url}`);
                event.preventDefault();
            }
        }
        catch (error) {
            console.warn('Failed to parse URL during will-navigate:', error);
            event.preventDefault();
        }
    });
    mainWindow.once('ready-to-show', () => {
        electron_log_1.default.info('Main window ready to show');
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
        electron_log_1.default.info('Main window closed');
        mainWindow = null;
    });
};
electron_1.app.whenReady().then(() => {
    electron_log_1.default.transports.file.level = 'info';
    electron_log_1.default.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
    electron_updater_1.autoUpdater.logger = electron_log_1.default;
    electron_updater_1.autoUpdater.on('checking-for-update', () => electron_log_1.default.info('Checking for update...'));
    electron_updater_1.autoUpdater.on('update-available', (info) => electron_log_1.default.info('Update available:', info.version));
    electron_updater_1.autoUpdater.on('update-not-available', () => electron_log_1.default.info('No updates available'));
    electron_updater_1.autoUpdater.on('error', (error) => electron_log_1.default.error('Auto update error:', error));
    electron_updater_1.autoUpdater.on('download-progress', (progress) => electron_log_1.default.info('Download progress:', progress.percent.toFixed(2) + '%'));
    electron_updater_1.autoUpdater.on('update-downloaded', () => electron_log_1.default.info('Update downloaded. Will install on quit.'));
    createWindow();
    const trustedOrigins = new Map([
        ['gizmo.ai', new Set(['geolocation', 'notifications'])]
    ]);
    electron_1.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const requestingUrl = webContents.getURL();
        const host = safeParseHost(requestingUrl);
        const trustedPermissions = host ? trustedOrigins.get(host) : undefined;
        electron_log_1.default.warn('Permission request intercepted', { permission, requestingUrl, host });
        if (permission === 'clipboard-read') {
            electron_log_1.default.info('Permission allowed (clipboard-read)', { requestingUrl });
            callback(true);
            return;
        }
        if (trustedPermissions && trustedPermissions.has(permission)) {
            electron_log_1.default.info('Permission allowed for trusted origin', { permission, host });
            callback(true);
            return;
        }
        electron_log_1.default.warn('Permission denied', { permission, requestingUrl });
        callback(false);
    });
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = details.responseHeaders || {};
        try {
            const requestUrl = new url_1.URL(details.url);
            if (requestUrl.protocol === 'file:') {
                const cspKey = Object.keys(headers).find((key) => key.toLowerCase() === 'content-security-policy');
                if (!cspKey) {
                    electron_log_1.default.info('Injecting fallback CSP for local asset', { url: details.url });
                    headers['Content-Security-Policy'] = [
                        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self'; child-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';"
                    ];
                }
            }
        }
        catch (error) {
            electron_log_1.default.warn('Failed to evaluate CSP injection target', { url: details.url, error });
        }
        callback({
            responseHeaders: headers
        });
    });
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    electron_1.app.on('web-contents-created', (_event, contents) => {
        contents.on('will-attach-webview', (event, webPreferences, params) => {
            electron_log_1.default.info('WebView attachment intercepted', { src: params.src, preload: webPreferences.preload });
            webPreferences.nodeIntegration = false;
            webPreferences.contextIsolation = true;
            delete webPreferences.preload;
            if (params.src && !/^https?:\/\//i.test(params.src)) {
                electron_log_1.default.warn('Blocked webview attachment to non-http(s) source', { src: params.src });
                event.preventDefault();
            }
        });
    });
    if (electron_1.app.isPackaged) {
        setImmediate(() => {
            electron_updater_1.autoUpdater.checkForUpdatesAndNotify().catch((error) => {
                electron_log_1.default.error('Failed to check for updates:', error);
            });
        });
    }
    else {
        electron_log_1.default.info('Skipping auto-update checks in development mode');
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// IPC handlers for browser functionality
electron_1.ipcMain.handle('navigate-to', async (_event, url) => {
    electron_log_1.default.info('IPC navigate-to request', { url });
    return { success: true, url };
});
electron_1.ipcMain.handle('go-back', async () => {
    electron_log_1.default.info('IPC go-back request received');
    return { success: true };
});
electron_1.ipcMain.handle('go-forward', async () => {
    electron_log_1.default.info('IPC go-forward request received');
    return { success: true };
});
electron_1.ipcMain.handle('reload', async () => {
    electron_log_1.default.info('IPC reload request received');
    return { success: true };
});
electron_1.ipcMain.handle('get-bookmarks', async () => {
    electron_log_1.default.info('IPC get-bookmarks request received');
    // In a real implementation, this would read from a file or database
    return [];
});
electron_1.ipcMain.handle('add-bookmark', async (_event, bookmark) => {
    electron_log_1.default.info('IPC add-bookmark request', bookmark);
    // In a real implementation, this would save to a file or database
    return { success: true };
});
electron_1.ipcMain.handle('remove-bookmark', async (_event, url) => {
    electron_log_1.default.info('IPC remove-bookmark request', { url });
    // In a real implementation, this would remove from a file or database
    return { success: true };
});
electron_1.ipcMain.on('renderer-log', (_event, payload) => {
    const { source, event, details } = payload;
    electron_log_1.default.debug(`[Renderer] ${event}`, { source, details });
});
