import { useMemo } from 'react'

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

interface SteamDownloadBarProps {
  downloads: SteamDownloadItem[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

function getStatusText(dl: SteamDownloadItem): string {
  if (dl.paused) return 'Pausado'
  if (dl.validating) return 'Validando'
  if (dl.downloading) return 'Descargando'
  return 'En cola'
}

export default function SteamDownloadBar({ downloads }: SteamDownloadBarProps): React.JSX.Element | null {
  const activeDownloads = useMemo(() => downloads.filter((dl) => dl.percent > 0 || dl.downloading || dl.validating), [downloads])

  if (activeDownloads.length === 0) return null

  return (
    <div className="steam-download-bar-container">
      {activeDownloads.map((dl) => (
        <div key={dl.appId} className="steam-download-item">
          <div className="steam-download-info">
            <span className="steam-download-name">{dl.name}</span>
            <span className="steam-download-status">{getStatusText(dl)}</span>
          </div>
          <div className="steam-download-progress-row">
            <div className="steam-download-progress-track">
              <div
                className={`steam-download-progress-fill ${dl.paused ? 'paused' : ''}`}
                style={{ width: `${dl.percent}%` }}
              />
            </div>
            <span className="steam-download-percent">{dl.percent.toFixed(1)}%</span>
          </div>
          <div className="steam-download-bytes">
            {formatBytes(dl.bytesToDownload > 0 ? dl.bytesDownloaded : dl.bytesStaged)} /{' '}
            {formatBytes(dl.bytesToDownload > 0 ? dl.bytesToDownload : dl.bytesToStage)}
          </div>
        </div>
      ))}
    </div>
  )
}
