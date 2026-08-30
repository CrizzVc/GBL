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
      launchGame: (gameId: string, exePath: string) => Promise<{
        success: boolean
        tracked: boolean
        startTime: number
        simulated?: boolean
        error?: string
      }>
      selectGameFile: () => Promise<string | null>
      getFileIcon: (filePath: string) => Promise<string | null>
      getGames: () => Promise<any[]>
      saveGames: (games: any[]) => Promise<{ success: boolean; error?: string }>
      onGameExited: (callback: (data: { gameId: string; durationMinutes: number }) => void) => () => void
      // Background image APIs
      selectBackgroundImage: () => Promise<string | null>
      getBackgroundImage: () => Promise<string | null>
      clearBackgroundImage: () => Promise<{ success: boolean }>
    }
  }
}
