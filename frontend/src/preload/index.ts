import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  launchGame: (gameId: string, exePath: string) => ipcRenderer.invoke('launch-game', gameId, exePath),
  selectGameFile: () => ipcRenderer.invoke('select-game-file'),
  getFileIcon: (filePath: string) => ipcRenderer.invoke('get-file-icon', filePath),
  getGames: () => ipcRenderer.invoke('get-games'),
  saveGames: (games: any[]) => ipcRenderer.invoke('save-games', games),
  onGameExited: (callback: (data: { gameId: string; durationMinutes: number }) => void) => {
    const subscription = (_event: any, data: { gameId: string; durationMinutes: number }) => callback(data)
    ipcRenderer.on('game-exited', subscription)
    return () => {
      ipcRenderer.removeListener('game-exited', subscription)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
