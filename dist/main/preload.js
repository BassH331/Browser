"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    navigateTo: (url) => electron_1.ipcRenderer.invoke('navigate-to', url),
    goBack: () => electron_1.ipcRenderer.invoke('go-back'),
    goForward: () => electron_1.ipcRenderer.invoke('go-forward'),
    reload: () => electron_1.ipcRenderer.invoke('reload'),
    getBookmarks: () => electron_1.ipcRenderer.invoke('get-bookmarks'),
    addBookmark: (bookmark) => electron_1.ipcRenderer.invoke('add-bookmark', bookmark),
    removeBookmark: (url) => electron_1.ipcRenderer.invoke('remove-bookmark', url),
    logEvent: (payload) => electron_1.ipcRenderer.send('renderer-log', payload)
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
