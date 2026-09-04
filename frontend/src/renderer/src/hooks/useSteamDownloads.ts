import { useState, useEffect, useRef, useCallback } from 'react'

export interface SteamDownloadItem {
  appId: string
  name: string
  bytesToDownload: number
  bytesDownloaded: number
  bytesToStage: number
  bytesStaged: number
  stateFlags: number
  downloading: boolean
  validating: boolean
  paused: boolean
  percent: number
  downloadSpeed: number
}

export interface DownloadCompletion {
  appId: string
  name: string
}

export function useSteamDownloads(pollIntervalMs: number = 1000): {
  downloads: SteamDownloadItem[]
  hasActiveDownloads: boolean
  completedDownloads: DownloadCompletion[]
  dismissCompletion: (appId: string) => void
} {
  const [downloads, setDownloads] = useState<SteamDownloadItem[]>([])
  const [completedDownloads, setCompletedDownloads] = useState<DownloadCompletion[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const prevDownloadsRef = useRef<Map<string, SteamDownloadItem>>(new Map())

  const fetchDownloads = useCallback((): void => {
    if (!window.api?.getSteamDownloadProgress) return
    window.api
      .getSteamDownloadProgress()
      .then((result) => {
        if (!mountedRef.current) return
        const list = Array.isArray(result) ? result : []
        setDownloads(list)

        // Detect completions
        const prevMap = prevDownloadsRef.current
        const completions: DownloadCompletion[] = []

        for (const [appId, prev] of prevMap) {
          const current = list.find((d) => d.appId === appId)
          if (!current || (current.percent >= 100 && !current.downloading && !current.validating)) {
            completions.push({ appId, name: prev.name })
          }
        }

        if (completions.length > 0) {
          setCompletedDownloads((prev) => [...prev, ...completions])
        }

        const newMap = new Map<string, SteamDownloadItem>()
        for (const d of list) {
          newMap.set(d.appId, d)
        }
        prevDownloadsRef.current = newMap
      })
      .catch((err) => {
        console.error('Error fetching Steam download progress:', err)
      })
  }, [])

  const dismissCompletion = useCallback((appId: string): void => {
    setCompletedDownloads((prev) => prev.filter((c) => c.appId !== appId))
  }, [])

  useEffect(() => {
    mountedRef.current = true

    fetchDownloads()

    intervalRef.current = setInterval(() => {
      fetchDownloads()
    }, pollIntervalMs)

    // Listen for real-time updates from main process (fs.watch on appmanifest)
    const removeListener = window.electron?.ipcRenderer?.on?.('steam-download-updated', () => {
      fetchDownloads()
    })

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (removeListener) removeListener()
    }
  }, [fetchDownloads, pollIntervalMs])

  return {
    downloads,
    hasActiveDownloads: downloads.length > 0,
    completedDownloads,
    dismissCompletion
  }
}
