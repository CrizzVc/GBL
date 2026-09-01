import { useState, useRef, useEffect, useCallback } from 'react'
import { useSystemMedia } from '../hooks/useSystemMedia'
import {
  formatMediaTime,
  getAppIconName,
  sendMediaControl,
  getMediaControlTarget
} from '../services/systemMediaService'

interface Track {
  id: string
  title: string
  artist: string
  src: string
  fileName?: string
  color?: string
}

function formatLocalTime(sec: number): string {
  if (!sec || Number.isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function MusicNoteIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}
function PauseIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}
function SkipBackIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  )
}
function SkipForwardIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}
function PlaySmallIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14c0 .86.94 1.39 1.66.9l10-7c.61-.43.61-1.37 0-1.8l-10-7A1.07 1.07 0 0 0 8 5.14z" />
    </svg>
  )
}

const FALLBACK_COLORS = ['#1DB954', '#e40d60', '#6a5acd', '#e67e22', '#2980b9', '#c0392b', '#16a085', '#8e44ad']

interface MusicPlayerProps {
  isVisible: boolean
  isIdle?: boolean
}

export default function MusicPlayer({ isVisible, isIdle = false }: MusicPlayerProps): React.JSX.Element {
  const { nowPlaying } = useSystemMedia()
  const systemActive = Boolean(nowPlaying)
  const systemTarget = getMediaControlTarget(nowPlaying)

  // Local fallback cuando no hay sesión del sistema — igual que WPS5 referencia: tracks precargados + import
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [positionSec, setPositionSec] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isImporting, setIsImporting] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const track = tracks[trackIndex] ?? null

  // Pausar audio local si el sistema toma el control (como WPS5)
  useEffect(() => {
    if (!systemActive || !audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
  }, [systemActive, nowPlaying?.id])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Cargar audio local cuando cambia track (solo si no hay sistema)
  useEffect(() => {
    if (systemActive || !track) return
    let cancelled = false
    const load = async (): Promise<void> => {
      const audio = audioRef.current
      if (!audio) return
      setPositionSec(0)
      setDurationSec(0)
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.src = track.src
      audio.load()
      if (isPlaying && !cancelled) {
        audio.play().catch(() => setIsPlaying(false))
      }
    }
    load()
    return () => { cancelled = true }
  }, [track?.src, trackIndex, systemActive]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (systemActive) return
    const audio = audioRef.current
    if (!audio || !track) return
    if (isPlaying) audio.play().catch(() => setIsPlaying(false))
    else audio.pause()
  }, [isPlaying, track, systemActive])

  const handleTimeUpdate = useCallback(() => {
    if (systemActive) return
    const audio = audioRef.current
    if (!audio) return
    setPositionSec(audio.currentTime)
  }, [systemActive])

  const handleLoadedMetadata = useCallback(() => {
    if (systemActive) return
    const audio = audioRef.current
    if (!audio) return
    setDurationSec(audio.duration || 0)
  }, [systemActive])

  const handleEnded = useCallback(() => {
    if (systemActive) return
    if (tracks.length === 0) return
    setTrackIndex((i) => (i + 1) % tracks.length)
  }, [tracks.length, systemActive])

  const togglePlay = useCallback(async () => {
    if (systemActive) {
      await sendMediaControl('play_pause', systemTarget)
      return
    }
    if (!track || !audioRef.current) return
    try {
      if (isPlaying) await audioRef.current.pause()
      else await audioRef.current.play()
    } catch {}
  }, [systemActive, systemTarget, track, isPlaying])

  const skipNext = useCallback(async () => {
    if (systemActive) {
      await sendMediaControl('next', systemTarget)
      return
    }
    if (tracks.length) setTrackIndex((i) => (i + 1) % tracks.length)
  }, [systemActive, systemTarget, tracks.length])

  const skipPrev = useCallback(async () => {
    if (systemActive) {
      await sendMediaControl('prev', systemTarget)
      return
    }
    const audio = audioRef.current
    if (audio && positionSec > 3) {
      audio.currentTime = 0
      return
    }
    if (tracks.length) setTrackIndex((i) => (i - 1 + tracks.length) % tracks.length)
  }, [systemActive, systemTarget, tracks.length, positionSec])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (systemActive) return
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setPositionSec(val)
    }
  }, [systemActive])

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setIsImporting(true)
    const newTracks: Track[] = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file)
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      return {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        artist: 'Importado',
        src: url,
        fileName: file.name,
        color: FALLBACK_COLORS[tracks.length % FALLBACK_COLORS.length]
      }
    })
    setTracks((prev) => [...prev, ...newTracks])
    if (tracks.length === 0) setTrackIndex(0)
    setIsImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [tracks.length])

  // Display derivado — idéntico a la referencia WPS5
  const displayTitle = systemActive ? nowPlaying!.title : track?.title ?? null
  const displayArtist = systemActive ? nowPlaying!.artist : track?.artist ?? null
  const displayAlbum = systemActive ? nowPlaying!.albumTitle : undefined
  const displayArtwork = systemActive ? nowPlaying!.thumbnail : undefined
  const displayPositionMs = systemActive ? nowPlaying!.positionMs : positionSec * 1000
  const displayDurationMs = systemActive ? nowPlaying!.durationMs : durationSec * 1000
  const displayPlaying = systemActive ? nowPlaying!.playbackStatus === 'playing' : isPlaying
  const accentColor = systemActive ? getAppIconName(nowPlaying!.appName).bg : (track?.color ?? '#1DB954')
  const headerLabel = systemActive ? `En ${nowPlaying!.appName}` : tracks.length > 0 ? 'Música local' : 'Música'
  const progress = displayDurationMs > 0 ? displayPositionMs / displayDurationMs : 0
  const canControl = systemActive || !!track

  const wrapperVisible = isVisible || isIdle

  // Sin nada que mostrar y sin sistema: mensaje vacío como referencia
  if (!systemActive && tracks.length === 0) {
    return (
      <div className={`music-player-wrapper ${wrapperVisible ? 'visible' : 'hidden'} ${isIdle ? 'idle' : ''}`} aria-hidden={!wrapperVisible}>
        <div className={`music-player ${isIdle ? 'idle' : ''} empty`} style={{ borderColor: isIdle ? accentColor : undefined } as React.CSSProperties}>
          <div className="music-player-cover" style={{ background: accentColor } as React.CSSProperties}>
            <MusicNoteIcon size={isIdle ? 52 : 16} />
          </div>
          <div className="music-player-main">
            <div className="music-player-info">
              <span className="music-player-title muted">Sin música</span>
              <span className="music-player-artist">{isIdle ? 'Reproduce algo en el PC' : 'Toca + para importar audio o reproduce en Spotify/YouTube'}</span>
              {systemActive && <span className="music-player-source">{headerLabel}</span>}
            </div>
            <div className="music-player-local-actions">
              <button
                className="music-btn add"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                title="Agregar música"
              >
                {isImporting ? '…' : '+'}
              </button>
              <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.flac,.ogg,.m4a,.aac,.wav" multiple onChange={handleImport} style={{ display: 'none' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`music-player-wrapper ${wrapperVisible ? 'visible' : 'hidden'} ${isIdle ? 'idle' : ''}`} aria-hidden={!wrapperVisible}>
      <div className={`music-player ${isIdle ? 'idle' : ''} ${systemActive ? 'system' : 'local'}`} style={{ borderColor: systemActive ? accentColor + '55' : undefined } as React.CSSProperties}>
        <audio
          ref={audioRef}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
          style={{ display: 'none' }}
        />
        {/* Cover con thumbnail real del sistema si existe */}
        <div className="music-player-cover" style={{ background: displayArtwork ? `url(${displayArtwork}) center/cover` : accentColor } as React.CSSProperties}>
          {!displayArtwork && <MusicNoteIcon size={isIdle ? 56 : 18} />}
        </div>

        <div className="music-player-main">
          <div className="music-player-header">
            <span className="music-player-app">{headerLabel}</span>
            <span className="music-player-status" style={{ background: displayPlaying ? accentColor : 'rgba(255,255,255,0.15)' }} />
          </div>

          <div className="music-player-info">
            <span className="music-player-title" title={displayTitle || ''}>{displayTitle || '—'}</span>
            <span className="music-player-artist">{displayArtist || '—'}</span>
            {displayAlbum && <span className="music-player-album">{displayAlbum}</span>}
          </div>

          <div className="music-player-progress">
            <span className="music-player-time">{formatMediaTime(displayPositionMs)}</span>
            <div className="music-player-progress-track">
              <div className="music-player-progress-fill" style={{ width: `${progress * 100}%`, background: accentColor } as React.CSSProperties} />
            </div>
            <span className="music-player-time">{displayDurationMs ? formatMediaTime(displayDurationMs) : '--:--'}</span>
            {/* slider solo para local (sistema es read-only) */}
            {!systemActive && (
              <input
                type="range"
                className="music-player-range"
                min={0}
                max={durationSec || 100}
                step={0.5}
                value={Math.min(positionSec, durationSec || 0)}
                onChange={handleSeek}
                disabled={!track || !durationSec}
                style={{ ['--progress' as string]: `${progress * 100}%` } as React.CSSProperties}
              />
            )}
          </div>

          <div className="music-player-controls">
            <button className="music-btn" onClick={skipPrev} disabled={!canControl} title="Anterior">
              <SkipBackIcon size={14} />
            </button>
            <button
              className="music-btn play"
              onClick={togglePlay}
              disabled={!canControl}
              style={{ background: accentColor, borderColor: accentColor } as React.CSSProperties}
              title={displayPlaying ? 'Pausar' : 'Reproducir'}
            >
              {displayPlaying ? <PauseIcon size={14} /> : <PlaySmallIcon size={14} />}
            </button>
            <button className="music-btn" onClick={skipNext} disabled={!canControl} title="Siguiente">
              <SkipForwardIcon size={14} />
            </button>
            {/* Volumen solo local */}
            {!systemActive && (
              <div className="music-player-volume">
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>{formatLocalTime(positionSec)} / {formatLocalTime(durationSec)}</span>
                <input type="range" className="music-player-volume-range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Volumen" />
              </div>
            )}
            {!systemActive && (
              <>
                <button className="music-btn add" onClick={() => fileInputRef.current?.click()} title="Importar audio">
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
                </button>
                <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.flac,.ogg,.m4a,.aac,.wav" multiple onChange={handleImport} style={{ display: 'none' }} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
