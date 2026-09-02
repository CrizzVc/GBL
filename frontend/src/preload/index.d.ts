import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    electronAPI: ElectronAPI & {
      getMediaSessions: () => Promise<any[]>
      mediaControl: (action: string, target?: any) => Promise<any>
      onMediaSessionsChanged: (callback: (sessions: any[]) => void) => () => void
    }
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
      onGameSessionStart: (callback: (data: { gameId: string }) => void) => () => void
      // Background image APIs
      selectBackgroundImage: () => Promise<string | null>
      getBackgroundImage: () => Promise<string | null>
      clearBackgroundImage: () => Promise<{ success: boolean }>
      // Wallpaper folder (una sola vez)
      selectWallpaperFolder: () => Promise<{ folder: string; images: Array<{ name: string; path: string; dataUrl: string; mtime: number }> } | null>
      getWallpaperFolder: () => Promise<string | null>
      getWallpaperImages: (folder?: string) => Promise<Array<{ name: string; path: string; dataUrl: string; mtime: number }>>
      setWallpaperAsBackground: (sourcePath: string) => Promise<string | null>
      // Profile APIs
      getProfile: () => Promise<{ name: string; avatar: string | null }>
      saveProfile: (profile: { name: string; avatar: string | null }) => Promise<{ success: boolean; error?: string }>
      selectProfileImage: () => Promise<string | null>
      // Store APIs
      getStores: () => Promise<{ id: string; name: string; installed: boolean; exePath: string | null }[]>
      openStore: (storeId: string) => Promise<{ success: boolean; error?: string }>
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>
      // Steam account APIs
      getSteamAccount: () => Promise<{
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }>
      saveSteamAccount: (steamAccount: {
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }) => Promise<{ success: boolean; error?: string }>
      openSteamOpenId: () => Promise<{
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }>
      getSteamInstallationStatus: (appIds: string[]) => Promise<Record<string, boolean>>
      getSystemMedia: () => Promise<{
        hasMedia: boolean
        title?: string
        artist?: string
        albumTitle?: string
        albumArtist?: string
        playbackStatus?: string
        playbackType?: string
        positionSeconds?: number
        endSeconds?: number
        thumbnail?: string
        error?: string
        raw?: any
      }>
      controlSystemMedia: (action: 'play' | 'pause' | 'toggle' | 'next' | 'previous' | 'prev' | string, target?: any) => Promise<{ success: boolean; error?: string }>
      getMediaSessions: () => Promise<any[]>
      mediaControl: (action: string, target?: any) => Promise<any>
      onMediaSessionsChanged: (callback: (sessions: any[]) => void) => () => void
    }
  }
}
