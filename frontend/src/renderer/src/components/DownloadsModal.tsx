import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { SteamDownloadItem } from '../hooks/useSteamDownloads'

export interface DownloadsModalGame {
  id: string
  name: string
  exePath?: string
  iconDataUrl?: string | null
  steamAppId?: string | null
  isSteam?: boolean
  gridImageUrl?: string | null
  heroImageUrl?: string | null
  createdAt?: string
  lastPlayed?: string | null
  installed?: boolean
}

export interface DownloadsModalSteamGame {
  appid: string
  name: string
  installed: boolean
  gridImageUrl?: string | null
  heroImageUrl?: string | null
  iconDataUrl?: string | null
}

interface DownloadsModalProps {
  isOpen: boolean
  onClose: () => void
  downloads: SteamDownloadItem[]
  forgottenDownloads: Set<string>
  onForgetDownload: (appId: string) => void
  games: DownloadsModalGame[]
  steamLibrary: DownloadsModalSteamGame[]
  onSelectGame?: (gameId: string) => void
}

function formatTimeRemaining(dl: SteamDownloadItem): string {
  if (dl.paused) return 'Paused'
  if (dl.validating) return 'Validating'
  if (!dl.downloading && dl.percent === 0) return 'Queued (1 item)'

  const total = dl.bytesToDownload > 0 ? dl.bytesToDownload : dl.bytesToStage
  const downloaded = dl.bytesToDownload > 0 ? dl.bytesDownloaded : dl.bytesStaged
  const remainingBytes = Math.max(0, total - downloaded)

  if (dl.downloadSpeed > 0 && remainingBytes > 0) {
    // dl.downloadSpeed is in Mbps (megabits per second -> convert to bytes/sec)
    const bytesPerSec = (dl.downloadSpeed * 1000 * 1000) / 8
    const remainingSeconds = Math.round(remainingBytes / bytesPerSec)

    if (remainingSeconds < 60) {
      return `${remainingSeconds} s left (1 item)`
    }
    const minutes = Math.floor(remainingSeconds / 60)
    if (minutes < 60) {
      return `${minutes} m left (1 item)`
    }
    const hours = Math.floor(minutes / 60)
    const remMinutes = minutes % 60
    return `${hours} h ${remMinutes} m left (1 item)`
  }

  if (dl.downloading) {
    if (dl.percent > 0) {
      return `${dl.percent.toFixed(0)}% (1 item)`
    }
    return 'Downloading (1 item)'
  }

  return 'Queued (1 item)'
}

export const DownloadsModal: React.FC<DownloadsModalProps> = ({
  isOpen,
  onClose,
  downloads,
  forgottenDownloads,
  onForgetDownload,
  games,
  steamLibrary,
  onSelectGame
}) => {
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; appId: string | null }>({
    visible: false,
    x: 0,
    y: 0,
    appId: null
  })

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const visibleDownloads = useMemo(() => {
    return downloads.filter((dl) => !forgottenDownloads.has(dl.appId))
  }, [downloads, forgottenDownloads])

  // Get artwork helper
  const getGameCover = useCallback(
    (appId?: string, name?: string): string | null => {
      if (!appId && !name) return null

      // Check local games
      const local = games.find(
        (g) =>
          (appId && (g.steamAppId === appId || g.id === appId)) ||
          (name && g.name.toLowerCase() === name.toLowerCase())
      )
      if (local?.gridImageUrl) return local.gridImageUrl
      if (local?.heroImageUrl) return local.heroImageUrl
      if (local?.iconDataUrl) return local.iconDataUrl

      // Check Steam library
      if (appId) {
        const steam = steamLibrary.find((s) => String(s.appid) === String(appId))
        if (steam?.gridImageUrl) return steam.gridImageUrl
        if (steam?.heroImageUrl) return steam.heroImageUrl
        if (steam?.iconDataUrl) return steam.iconDataUrl
        return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x600.jpg`
      }

      return null
    },
    [games, steamLibrary]
  )

  // Determine recently installed games from user's library (last 5 installed)
  const recentlyInstalledList = useMemo(() => {
    const list: Array<{ id: string; name: string; cover: string | null; badge: string; status: string }> = []
    const seenNames = new Set<string>()

    // Sort local games by newest first (createdAt or lastPlayed)
    const sortedGames = [...games].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.lastPlayed || 0).getTime()
      const timeB = new Date(b.createdAt || b.lastPlayed || 0).getTime()
      return timeB - timeA
    })

    for (const g of sortedGames) {
      if (list.length >= 5) break
      seenNames.add(g.name.toLowerCase())
      list.push({
        id: g.id,
        name: g.name,
        cover: g.gridImageUrl || g.heroImageUrl || g.iconDataUrl || (g.steamAppId ? `https://cdn.akamai.steamstatic.com/steam/apps/${g.steamAppId}/library_600x600.jpg` : null),
        badge: g.isSteam ? 'STEAM' : 'PC',
        status: 'Instalado'
      })
    }

    // Supplement with installed Steam library games if fewer than 5
    if (list.length < 5) {
      const installedSteam = steamLibrary.filter((s) => s.installed && !seenNames.has(s.name.toLowerCase()))
      for (const s of installedSteam) {
        if (list.length >= 5) break
        list.push({
          id: `steam-${s.appid}`,
          name: s.name,
          cover: s.gridImageUrl || s.heroImageUrl || s.iconDataUrl || `https://cdn.akamai.steamstatic.com/steam/apps/${s.appid}/library_600x600.jpg`,
          badge: 'STEAM',
          status: 'Instalado'
        })
      }
    }

    return list
  }, [games, steamLibrary])

  if (!isOpen) return null

  return (
    <div className="ps-downloads-overlay" onClick={onClose}>
      <div className="ps-downloads-container" onClick={(e) => e.stopPropagation()}>
        {/* Left Rail with PS5 scroll indicators */}
        <div className="ps-downloads-nav-rail">
          <div className="ps-nav-indicator top">
            <div className="ps-dots-vertical">
              <span />
              <span />
              <span />
            </div>
            <svg className="ps-arrow-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12L2 6h12l-6 6z" />
            </svg>
          </div>

          <div className="ps-nav-indicator bottom">
            <svg className="ps-arrow-icon" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4l6 6H2l6-6z" />
            </svg>
            <div className="ps-dots-vertical">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="ps-downloads-main">
          {/* Section: Downloads/Copies */}
          <div className="ps-downloads-section">
            <div className="ps-section-header">Downloads/Copies</div>

            <div className="ps-section-list">
              {visibleDownloads.length === 0 ? (
                <div className="ps-download-empty-card">
                  <span className="ps-download-empty-text">No active downloads</span>
                </div>
              ) : (
                visibleDownloads.map((dl, index) => {
                  const coverUrl = getGameCover(dl.appId, dl.name)
                  const isFirstActive = index === 0
                  const timeText = formatTimeRemaining(dl)
                  const hasProgress = dl.downloading || dl.percent > 0 || dl.paused || dl.validating

                  return (
                    <div
                      key={dl.appId}
                      className={`ps-download-card ${isFirstActive ? 'focused active' : ''}`}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, appId: dl.appId })
                      }}
                    >
                      <div className="ps-card-content">
                        {/* Thumbnail */}
                        <div className="ps-card-thumb-wrapper">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={dl.name}
                              className="ps-card-thumb"
                              onError={(e) => {
                                // fallback to header image or placeholder
                                const target = e.currentTarget
                                if (!target.src.includes('header.jpg')) {
                                  target.src = `https://cdn.akamai.steamstatic.com/steam/apps/${dl.appId}/header.jpg`
                                } else {
                                  target.style.display = 'none'
                                }
                              }}
                            />
                          ) : (
                            <div className="ps-card-thumb-fallback">
                              <span>{dl.name.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                        </div>

                        {/* Title & Badge */}
                        <div className="ps-card-info">
                          <div className="ps-card-title" title={dl.name}>
                            {dl.name}
                          </div>
                          <div className="ps-card-meta">
                            <span className="ps-card-badge">PS5</span>
                          </div>
                        </div>

                        {/* Status / Time remaining */}
                        <div className="ps-card-status">
                          <span className="ps-status-text">{timeText}</span>
                        </div>
                      </div>

                      {/* Progress Bar inside focused / active card */}
                      {hasProgress && (
                        <div className="ps-card-progress-track">
                          <div
                            className={`ps-card-progress-fill ${dl.paused ? 'paused' : ''}`}
                            style={{ width: `${Math.max(3, Math.min(100, dl.percent))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Section: Recently installed */}
          <div className="ps-downloads-section">
            <div className="ps-section-header">Recently installed</div>

            <div className="ps-section-list">
              {recentlyInstalledList.length === 0 ? (
                <div className="ps-download-empty-card">
                  <span className="ps-download-empty-text">No hay juegos instalados recientemente</span>
                </div>
              ) : (
                recentlyInstalledList.map((item) => (
                  <div
                    key={item.id}
                    className="ps-download-card ps-installed-card"
                    onClick={() => {
                      if (onSelectGame) {
                        onSelectGame(item.id)
                        onClose()
                      }
                    }}
                  >
                    <div className="ps-card-content">
                      {/* Thumbnail */}
                      <div className="ps-card-thumb-wrapper">
                        {item.cover ? (
                          <img src={item.cover} alt={item.name} className="ps-card-thumb" />
                        ) : (
                          <div className="ps-card-thumb-fallback">
                            <span>{item.name.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="ps-card-info">
                        <div className="ps-card-title" title={item.name}>
                          {item.name}
                        </div>
                        {item.badge ? (
                          <div className="ps-card-meta">
                            <span className="ps-card-badge">{item.badge}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Status */}
                      <div className="ps-card-status">
                        <span className="ps-status-text">{item.status}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Close Button top-right (subtle) */}
        <button className="ps-modal-close-btn" onClick={onClose} title="Cerrar">
          &times;
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.appId && (
        <div
          className="context-menu-backdrop"
          onClick={() => setContextMenu({ visible: false, x: 0, y: 0, appId: null })}
        >
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="context-menu-item"
              onClick={() => {
                onForgetDownload(contextMenu.appId!)
                setContextMenu({ visible: false, x: 0, y: 0, appId: null })
              }}
            >
              Olvidar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
