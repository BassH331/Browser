import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  navigateTo: (url: string) => Promise<{ success: boolean; url: string }>;
  goBack: () => Promise<{ success: boolean }>;
  goForward: () => Promise<{ success: boolean }>;
  reload: () => Promise<{ success: boolean }>;
  getBookmarks: () => Promise<Array<{ title: string; url: string }>>;
  addBookmark: (bookmark: { title: string; url: string }) => Promise<{ success: boolean }>;
  removeBookmark: (url: string) => Promise<{ success: boolean }>;
}

const electronAPI: ElectronAPI = {
  navigateTo: (url: string) => ipcRenderer.invoke('navigate-to', url),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  addBookmark: (bookmark) => ipcRenderer.invoke('add-bookmark', bookmark),
  removeBookmark: (url) => ipcRenderer.invoke('remove-bookmark', url),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
