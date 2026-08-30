import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSystemInfo: () => Promise<{
        platform: string
        arch: string
        cpus: string
        totalMemory: string
        freeMemory: string
        uptime: string
      }>
      launchGame: (gameName: string) => Promise<{
        gameName: string
        status: string
        sessionPlaytimeMinutes: number
      }>
    }
  }
}
