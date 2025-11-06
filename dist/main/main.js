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
let mainWindow = null;
const createWindow = () => {
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
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
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
        try {
            const parsed = new URL(url);
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
        mainWindow?.show();
    });
    mainWindow.on('closed', () => {
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
    electron_1.session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = new Set(['clipboard-read']);
        if (allowedPermissions.has(permission)) {
            callback(true);
        }
        else {
            console.warn(`Blocked permission request for: ${permission}`);
            callback(false);
        }
    });
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
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
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    electron_1.app.on('web-contents-created', (_event, contents) => {
        contents.on('will-attach-webview', (event, webPreferences, params) => {
            webPreferences.nodeIntegration = false;
            webPreferences.contextIsolation = true;
            delete webPreferences.preload;
            if (params.src && !/^https?:\/\//i.test(params.src)) {
                electron_log_1.default.warn(`Blocked webview attachment to ${params.src}`);
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
electron_1.ipcMain.handle('navigate-to', async (event, url) => {
    return { success: true, url };
});
electron_1.ipcMain.handle('go-back', async (event) => {
    return { success: true };
});
electron_1.ipcMain.handle('go-forward', async (event) => {
    return { success: true };
});
electron_1.ipcMain.handle('reload', async (event) => {
    return { success: true };
});
electron_1.ipcMain.handle('get-bookmarks', async (event) => {
    // In a real implementation, this would read from a file or database
    return [];
});
electron_1.ipcMain.handle('add-bookmark', async (event, bookmark) => {
    // In a real implementation, this would save to a file or database
    return { success: true };
});
electron_1.ipcMain.handle('remove-bookmark', async (event, url) => {
    // In a real implementation, this would remove from a file or database
    return { success: true };
});
