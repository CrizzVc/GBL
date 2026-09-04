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
}

export function useSteamDownloads(pollIntervalMs: number = 3000): {
  downloads: SteamDownloadItem[]
  hasActiveDownloads: boolean
} {
  const [downloads, setDownloads] = useState<SteamDownloadItem[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const fetchDownloads = useCallback((): void => {
    if (!window.api?.getSteamDownloadProgress) return
    window.api
      .getSteamDownloadProgress()
      .then((result) => {
        if (mountedRef.current) {
          setDownloads(Array.isArray(result) ? result : [])
        }
      })
      .catch((err) => {
        console.error('Error fetching Steam download progress:', err)
      })
  }, [])

  useEffect(() => {
    mountedRef.current = true

    fetchDownloads()

    intervalRef.current = setInterval(() => {
      fetchDownloads()
    }, pollIntervalMs)

    return () => {
      mountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchDownloads, pollIntervalMs])

  return {
    downloads,
    hasActiveDownloads: downloads.length > 0
  }
}
