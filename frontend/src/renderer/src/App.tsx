import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PlayIcon,
  PlusIcon,
  SystemIcon,
  CloseIcon,
  WifiIcon,
  BatteryIcon,
  LibraryIcon,
  StoreIcon,
  SettingsIcon,
  PowerIcon,
  TrashIcon,
  EditIcon,
  FolderIcon
} from './components/Icons'

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */
interface Game {
  id: string
  name: string
  exePath: string
  iconDataUrl: string | null
  playtimeMinutes: number
  lastPlayed: string | null
  color: string
}

type ModalType = 'specs' | 'addGame' | 'editGame' | 'library' | 'settings' | null

interface SystemInfo {
  platform: string
  arch: string
  cpus: string
  totalMemory: string
  freeMemory: string
  uptime: string
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  gameId: string | null
}

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */
const GAME_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
]

function randomColor(): string {
  return GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)]
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function formatPlaytime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/* ────────────────────────────────────────────
   App
   ──────────────────────────────────────────── */
function App(): React.JSX.Element {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [runningGameId, setRunningGameId] = useState<string | null>(null)
  const [clock, setClock] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    gameId: null
  })

  // Add / Edit game form state
  const [formName, setFormName] = useState('')
  const [formExePath, setFormExePath] = useState('')
  const [formIconUrl, setFormIconUrl] = useState<string | null>(null)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)

  const gamesRowRef = useRef<HTMLDivElement>(null)

  const selectedGame = games.find((g) => g.id === selectedGameId) || null

  // ── Clock ──
  useEffect(() => {
    const tick = (): void => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Load games from disk ──
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const stored = await window.api.getGames()
        if (Array.isArray(stored) && stored.length > 0) {
          setGames(stored)
          setSelectedGameId(stored[0].id)
        }
      } catch (err) {
        console.error('Error loading games:', err)
      }
    }
    load()
  }, [])

  // ── Listen for game-exited events from main process ──
  useEffect(() => {
    const unsubscribe = window.api.onGameExited((data) => {
      setRunningGameId(null)
      setGames((prev) => {
        const updated = prev.map((g) =>
          g.id === data.gameId
            ? {
                ...g,
                playtimeMinutes: g.playtimeMinutes + data.durationMinutes,
                lastPlayed: new Date().toISOString()
              }
            : g
        )
        window.api.saveGames(updated)
        return updated
      })
    })
    return unsubscribe
  }, [])

  // ── Close context menu on click anywhere ──
  useEffect(() => {
    const handleClick = (): void => {
      setContextMenu((prev) => ({ ...prev, visible: false }))
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // ── Persist games ──
  const saveGames = useCallback(
    (newGames: Game[]) => {
      setGames(newGames)
      window.api.saveGames(newGames)
    },
    []
  )

  // ── Select game file ──
  const handleBrowse = useCallback(async () => {
    const filePath = await window.api.selectGameFile()
    if (filePath) {
      setFormExePath(filePath)
      const icon = await window.api.getFileIcon(filePath)
      if (icon) setFormIconUrl(icon)
      if (!formName) {
        const filename = filePath.split(/[\\/]/).pop() || ''
        const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
        setFormName(nameWithoutExt)
      }
    }
  }, [formName])

  // ── Add game ──
  const handleAddGame = useCallback(() => {
    if (!formName.trim()) return
    const newGame: Game = {
      id: generateId(),
      name: formName.trim(),
      exePath: formExePath.trim(),
      iconDataUrl: formIconUrl,
      playtimeMinutes: 0,
      lastPlayed: null,
      color: randomColor()
    }
    const newGames = [...games, newGame]
    saveGames(newGames)
    setSelectedGameId(newGame.id)
    setModal(null)
    resetForm()
  }, [formName, formExePath, formIconUrl, games, saveGames])

  // ── Edit game ──
  const handleEditGame = useCallback(() => {
    if (!formName.trim() || !editingGameId) return
    const newGames = games.map((g) =>
      g.id === editingGameId
        ? {
            ...g,
            name: formName.trim(),
            exePath: formExePath.trim(),
            iconDataUrl: formIconUrl ?? g.iconDataUrl
          }
        : g
    )
    saveGames(newGames)
    setModal(null)
    resetForm()
  }, [formName, formExePath, formIconUrl, editingGameId, games, saveGames])

  // ── Delete game ──
  const handleDeleteGame = useCallback(
    (gameId: string) => {
      const newGames = games.filter((g) => g.id !== gameId)
      saveGames(newGames)
      if (selectedGameId === gameId) {
        setSelectedGameId(newGames.length > 0 ? newGames[0].id : null)
      }
    },
    [games, selectedGameId, saveGames]
  )

  // ── Launch game ──
  const handleLaunchGame = useCallback(async () => {
    if (!selectedGame) return
    setRunningGameId(selectedGame.id)
    try {
      await window.api.launchGame(selectedGame.id, selectedGame.exePath)
    } catch (err) {
      console.error('Error launching game:', err)
      setRunningGameId(null)
    }
  }, [selectedGame])

  // ── Open specs modal ──
  const handleOpenSpecs = useCallback(async () => {
    try {
      const info = await window.api.getSystemInfo()
      setSystemInfo(info)
      setModal('specs')
    } catch (err) {
      console.error('Error fetching system info:', err)
    }
  }, [])

  // ── Open add game modal ──
  const openAddGameModal = useCallback(() => {
    resetForm()
    setModal('addGame')
  }, [])

  // ── Open edit game modal ──
  const openEditGameModal = useCallback(
    (gameId: string) => {
      const game = games.find((g) => g.id === gameId)
      if (!game) return
      setEditingGameId(gameId)
      setFormName(game.name)
      setFormExePath(game.exePath)
      setFormIconUrl(game.iconDataUrl)
      setModal('editGame')
    },
    [games]
  )

  const resetForm = (): void => {
    setFormName('')
    setFormExePath('')
    setFormIconUrl(null)
    setEditingGameId(null)
  }

  // ── Context menu handler ──
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, gameId: string) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        gameId
      })
    },
    []
  )

  // ── Background gradient based on selected game ──
  const bgStyle = selectedGame
    ? {
        background: `radial-gradient(ellipse at 50% 60%, ${selectedGame.color}15 0%, transparent 60%), var(--gbl-bg-primary)`
      }
    : {}

  return (
    <div className="launcher">
      {/* Animated background */}
      <div className="launcher-bg" style={bgStyle} />

      {/* ── Header ── */}
      <header className="header-bar">
        <div className="header-left">
          <div className="user-avatar">G</div>
          <div className="header-greeting">
            <span className="header-greeting-name">GBL Launcher</span>
            <span className="header-greeting-sub">
              {games.length} {games.length === 1 ? 'juego' : 'juegos'}
            </span>
          </div>
        </div>
        <div className="header-right">
          <WifiIcon size={18} className="header-icon" />
          <BatteryIcon size={18} className="header-icon" />
          <span className="header-clock">{clock}</span>
        </div>
      </header>

      {/* ── Hero section ── */}
      <section className="hero-section">
        {selectedGame && (
          <div className="hero-content">
            <h1 className="hero-title">{selectedGame.name}</h1>
            <div className="hero-meta">
              <span>{formatPlaytime(selectedGame.playtimeMinutes)} jugado</span>
              {selectedGame.lastPlayed && (
                <>
                  <div className="hero-meta-dot" />
                  <span>
                    Última vez:{' '}
                    {new Date(selectedGame.lastPlayed).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </>
              )}
            </div>
            <div className="hero-actions">
              <button
                className={`btn-play ${runningGameId === selectedGame.id ? 'running' : ''}`}
                onClick={handleLaunchGame}
                id="btn-launch"
              >
                <PlayIcon size={18} />
                {runningGameId === selectedGame.id ? 'Ejecutando...' : 'Jugar'}
              </button>
            </div>
          </div>
        )}
        {!selectedGame && games.length === 0 && (
          <div className="hero-content">
            <h1 className="hero-title">Bienvenido a GBL</h1>
            <div className="hero-meta">
              <span>Agrega tu primer juego para comenzar</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Game cards row ── */}
      <div className="games-row-container">
        <div className="games-row" ref={gamesRowRef}>
          {games.map((game) => (
            <div
              key={game.id}
              className={`game-card ${selectedGameId === game.id ? 'selected' : ''}`}
              onClick={() => setSelectedGameId(game.id)}
              onDoubleClick={handleLaunchGame}
              onContextMenu={(e) => handleContextMenu(e, game.id)}
              title={game.name}
              id={`game-card-${game.id}`}
            >
              {runningGameId === game.id && <div className="running-badge" />}
              {game.iconDataUrl ? (
                <img
                  src={game.iconDataUrl}
                  alt={game.name}
                  className="game-card-icon"
                  draggable={false}
                />
              ) : (
                <div
                  className="game-card-placeholder"
                  style={{ background: `linear-gradient(135deg, ${game.color}30, ${game.color}15)` }}
                >
                  {game.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {/* Add game card */}
          <div
            className="game-card add-card"
            onClick={openAddGameModal}
            id="btn-add-game"
            title="Agregar juego"
          >
            <div className="add-card-content">
              <PlusIcon size={28} />
              <span className="add-card-label">Agregar</span>
            </div>
          </div>

          {/* Library card */}
          {games.length > 0 && (
            <div
              className="game-card library-card"
              onClick={() => setModal('library')}
              id="btn-library"
              title="Biblioteca"
            >
              <div className="library-card-content">
                <LibraryIcon size={28} />
                <span className="library-card-label">Biblioteca</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="bottom-row">
        <div className="bottom-card" onClick={handleOpenSpecs} id="btn-specs">
          <SystemIcon size={22} className="bottom-card-icon" />
          <div className="bottom-card-text">
            <span className="bottom-card-title">Especificaciones</span>
            <span className="bottom-card-sub">Hardware del sistema</span>
          </div>
        </div>
        <div className="bottom-card" id="btn-store">
          <StoreIcon size={22} className="bottom-card-icon" />
          <div className="bottom-card-text">
            <span className="bottom-card-title">Tiendas</span>
            <span className="bottom-card-sub">Steam, Epic, GOG</span>
          </div>
        </div>
        <div className="bottom-card" onClick={() => setModal('settings')} id="btn-settings">
          <SettingsIcon size={22} className="bottom-card-icon" />
          <div className="bottom-card-text">
            <span className="bottom-card-title">Ajustes</span>
            <span className="bottom-card-sub">Interfaz y preferencias</span>
          </div>
        </div>
        <div
          className="bottom-card exit-card"
          onClick={() => window.close()}
          id="btn-exit"
        >
          <PowerIcon size={22} className="bottom-card-icon" />
          <div className="bottom-card-text">
            <span className="bottom-card-title">Salir</span>
            <span className="bottom-card-sub">Cerrar launcher</span>
          </div>
        </div>
      </div>

      {/* ── Context Menu ── */}
      {contextMenu.visible && contextMenu.gameId && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              setSelectedGameId(contextMenu.gameId)
              handleLaunchGame()
            }}
          >
            <PlayIcon size={16} /> Jugar
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              if (contextMenu.gameId) openEditGameModal(contextMenu.gameId)
            }}
          >
            <EditIcon size={16} /> Editar
          </button>
          <div className="context-menu-separator" />
          <button
            className="context-menu-item danger"
            onClick={() => {
              if (contextMenu.gameId) handleDeleteGame(contextMenu.gameId)
            }}
          >
            <TrashIcon size={16} /> Eliminar
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════
          MODALS
          ══════════════════════════════════════════ */}

      {/* ── Specs Modal ── */}
      {modal === 'specs' && systemInfo && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Especificaciones del Sistema</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="specs-grid">
              <div className="spec-item">
                <div className="spec-label">Sistema Operativo</div>
                <div className="spec-value">{systemInfo.platform}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Arquitectura</div>
                <div className="spec-value">{systemInfo.arch}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Procesador</div>
                <div className="spec-value">{systemInfo.cpus}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Memoria Total</div>
                <div className="spec-value">{systemInfo.totalMemory}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Memoria Libre</div>
                <div className="spec-value">{systemInfo.freeMemory}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Tiempo Activo</div>
                <div className="spec-value">{systemInfo.uptime}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Game Modal ── */}
      {modal === 'addGame' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Agregar Juego</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre del juego</label>
              <input
                className="form-input"
                type="text"
                placeholder="Ej: Minecraft, GTA V..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                id="input-game-name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Archivo ejecutable</label>
              <div className="form-file-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ruta al .exe o acceso directo"
                  value={formExePath}
                  onChange={(e) => setFormExePath(e.target.value)}
                  id="input-game-path"
                />
                <button className="btn-browse" onClick={handleBrowse}>
                  <FolderIcon size={16} />
                </button>
              </div>
            </div>
            {formIconUrl && (
              <div className="icon-preview">
                <img src={formIconUrl} alt="Icono del juego" />
                <span className="icon-preview-text">Icono extraído automáticamente</span>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleAddGame}
                disabled={!formName.trim()}
                id="btn-save-game"
              >
                Agregar juego
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Game Modal ── */}
      {modal === 'editGame' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Juego</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Nombre del juego</label>
              <input
                className="form-input"
                type="text"
                placeholder="Nombre del juego"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Archivo ejecutable</label>
              <div className="form-file-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ruta al .exe o acceso directo"
                  value={formExePath}
                  onChange={(e) => setFormExePath(e.target.value)}
                />
                <button className="btn-browse" onClick={handleBrowse}>
                  <FolderIcon size={16} />
                </button>
              </div>
            </div>
            {formIconUrl && (
              <div className="icon-preview">
                <img src={formIconUrl} alt="Icono del juego" />
                <span className="icon-preview-text">Icono del juego</span>
              </div>
            )}
            <div className="modal-actions">
              <button
                className="btn-danger"
                onClick={() => {
                  if (editingGameId) handleDeleteGame(editingGameId)
                  setModal(null)
                  resetForm()
                }}
              >
                Eliminar
              </button>
              <button className="btn-secondary" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleEditGame}
                disabled={!formName.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Library Modal ── */}
      {modal === 'library' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 520 }}>
            <div className="modal-header">
              <h2 className="modal-title">Biblioteca ({games.length})</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            {games.length === 0 ? (
              <div className="library-empty">
                No hay juegos en tu biblioteca. ¡Agrega uno para comenzar!
              </div>
            ) : (
              <div className="library-grid">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="library-item"
                    onClick={() => {
                      setSelectedGameId(game.id)
                      setModal(null)
                    }}
                  >
                    {game.iconDataUrl ? (
                      <img
                        src={game.iconDataUrl}
                        alt={game.name}
                        className="library-item-icon"
                        draggable={false}
                      />
                    ) : (
                      <div
                        className="game-card-placeholder"
                        style={{
                          width: 48,
                          height: 48,
                          background: `linear-gradient(135deg, ${game.color}30, ${game.color}15)`
                        }}
                      >
                        {game.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="library-item-name">{game.name}</span>
                    <div className="library-item-actions">
                      <button
                        className="library-action-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditGameModal(game.id)
                        }}
                        title="Editar"
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        className="library-action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteGame(game.id)
                        }}
                        title="Eliminar"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Settings Modal ── */}
      {modal === 'settings' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ajustes</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            <div className="specs-grid">
              <div className="spec-item" style={{ gridColumn: '1 / -1' }}>
                <div className="spec-label">Versión</div>
                <div className="spec-value">GBL Launcher v1.0.0</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Juegos Agregados</div>
                <div className="spec-value">{games.length}</div>
              </div>
              <div className="spec-item">
                <div className="spec-label">Tiempo Total Jugado</div>
                <div className="spec-value">
                  {formatPlaytime(games.reduce((sum, g) => sum + g.playtimeMinutes, 0))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
