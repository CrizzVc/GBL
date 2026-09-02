import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  PlayIcon,
  PlusIcon,
  SystemIcon,
  CloseIcon,
  WifiIcon,
  BatteryIcon,
  StoreIcon,
  SettingsIcon,
  PowerIcon,
  TrashIcon,
  EditIcon,
  FolderIcon
} from './components/Icons'

import MusicPlayer from './components/MusicPlayer'

import steamLogo from './assets/tiendas/steamLogo.png'
import epicLogo from './assets/tiendas/EpicLogo.png'
import gogLogo from './assets/tiendas/gogLogo.png'
import steamBanner from './assets/tiendas/steamBanner.png'
import epicBanner from './assets/tiendas/EpicBanner.png'
import gogBanner from './assets/tiendas/gogBanner.png'
import Teen from './assets/ratings/T.png'
import installIcon from './assets/images/install.png'
import controllerImg from './assets/images/controller.png'
import defaultHomeBackground from './assets/images/background-defauld.png'
import { useSystemMedia } from './hooks/useSystemMedia'
import {
  playMove,
  playEnter,
  playEnterGame,
  playClose,
  playControllerConnected,
  playControllerDisconnected
} from './services/soundService'
import { useGamepadNavigation } from './hooks/useGamepadNavigation'

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
  createdAt: string
  color: string
  steamAppId?: string | null
  isSteam?: boolean
  // SteamGridDB fields
  steamGridId?: number | null
  gridImageUrl?: string | null
  heroImageUrl?: string | null
  logoImageUrl?: string | null
}

type QuickAppKind = 'game' | 'program'

interface QuickApp {
  id: string
  name: string
  exePath: string
  artworkUrl: string | null
  iconDataUrl: string | null
  lastPlayed: string | null
  createdAt: string
  kind: QuickAppKind
}

type ModalType = 'specs' | 'addGame' | 'editGame' | 'library' | 'settings' | 'steamgrid' | null

interface Store {
  id: string
  name: string
  installed: boolean
  exePath: string | null
}

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

interface SteamGridGame {
  id: number
  name: string
  types: string[]
  verified: boolean
}

interface SteamGridImage {
  id: number
  url: string
  thumb: string
  style: string
  width: number
  height: number
}

const DEFAULT_STEAM_API_KEY = 'B1F361EA3C07B455DC8B0D06ED179B00'
const QUICK_APPS_STORAGE_KEY = 'gbl-quick-apps'

interface SteamAccount {
  linked: boolean
  apiKey: string
  steamId: string
  accountName: string
  steamId64: string | null
}

interface SteamLibraryGame {
  appid: string
  name: string
  playtime_forever: number
  img_icon_url: string
  img_logo_url: string
  img_capsule: string
  has_community_visible_stats: boolean
  installed: boolean
  gridImageUrl?: string | null
  heroImageUrl?: string | null
  logoImageUrl?: string | null
  iconDataUrl?: string | null
}
 
interface SteamFriend {
  steamid: string
  personaname: string
  avatar?: string | null
  avatarfull?: string | null
  profileurl?: string | null
  personastate?: number
  gameid?: string | null
  gameextrainfo?: string | null
}
 
type SteamGridArtType = 'grids' | 'square_grids' | 'heroes' | 'logos' | 'icons'
type LibrarySource = 'local' | 'steam'

function isFriendActive(friend: SteamFriend): boolean {
  return Boolean(friend.gameextrainfo) || Number(friend.personastate) > 0
}

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */
const GAME_COLORS = [
  '#6b7280', '#9ca3af', '#d1d5db', '#4b5563', '#374151',
  '#a3a3a3', '#737373', '#525252', '#e5e7eb', '#78716c'
]

const BACKEND_URL = 'http://localhost:3000'
const RECENT_GAMES_LIMIT = 15
const STEAM_ARTWORK_STORAGE_KEY = 'gbl-steam-artwork'

function getStoredSteamArtwork(): Record<string, Pick<SteamLibraryGame, 'gridImageUrl' | 'heroImageUrl' | 'logoImageUrl' | 'iconDataUrl'>> {
  try {
    const stored = localStorage.getItem(STEAM_ARTWORK_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function getStoredQuickApps(): QuickApp[] {
  try {
    const stored = localStorage.getItem(QUICK_APPS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((app): app is QuickApp => !!app && typeof app.id === 'string' && typeof app.name === 'string' && typeof app.exePath === 'string')
      // Compat: apps guardadas antes de introducir "kind" se tratan como 'game' (comportamiento previo)
      .map((app) => ({ ...app, kind: app.kind === 'program' ? 'program' : 'game' }))
  } catch {
    return []
  }
}

const sortGamesByNewestFirst = (items: Game[]): Game[] =>
  [...items].sort((a, b) => {
    // El último jugado va primero; si no tiene lastPlayed se usa createdAt
    const aDate = new Date(a.lastPlayed || a.createdAt || 0).getTime()
    const bDate = new Date(b.lastPlayed || b.createdAt || 0).getTime()
    return bDate - aDate
  })

const getRecentGames = (items: Game[]): Game[] => sortGamesByNewestFirst(items).slice(0, RECENT_GAMES_LIMIT)

const STORE_IMAGES: Record<string, { banner: string; logo: string }> = {
  steam: { banner: steamBanner, logo: steamLogo },
  epic: { banner: epicBanner, logo: epicLogo },
  gog: { banner: gogBanner, logo: gogLogo }
}

function storeCapsuleImage(id: string): string | null {
  return STORE_IMAGES[id]?.banner || null
}

function storeLogoImage(id: string): string | null {
  return STORE_IMAGES[id]?.logo || null
}

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

async function fetchAutoArtworkUrl(appName: string): Promise<string | null> {
  try {
    const searchRes = await fetch(`${BACKEND_URL}/api/steamgrid/search?term=${encodeURIComponent(appName)}`)
    if (!searchRes.ok) return null

    const searchData = await searchRes.json()
    if (!Array.isArray(searchData) || searchData.length === 0) return null

    const gameId = searchData[0].id
    const squareGridsRes = await fetch(`${BACKEND_URL}/api/steamgrid/square_grids/${gameId}`)
    if (squareGridsRes.ok) {
      const squareGrids = await squareGridsRes.json()
      if (Array.isArray(squareGrids) && squareGrids.length > 0 && squareGrids[0].url) {
        return squareGrids[0].url
      }
    }

    const gridsRes = await fetch(`${BACKEND_URL}/api/steamgrid/grids/${gameId}`)
    if (!gridsRes.ok) return null
    const grids = await gridsRes.json()
    return Array.isArray(grids) && grids.length > 0 ? grids[0].url || null : null
  } catch (err) {
    console.error('Error auto-fetching artwork:', err)
    return null
  }
}

/* ────────────────────────────────────────────
   SearchIcon component (inline)
   ──────────────────────────────────────────── */
function SearchIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ImageIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function ChevronLeftIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function MoreIcon({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   App
   ──────────────────────────────────────────── */
function App(): React.JSX.Element {
  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [homeCardMode, setHomeCardMode] = useState<'main' | 'bottom' | 'quick-apps'>('main')
  const [quickAppFocusIndex, setQuickAppFocusIndex] = useState<number>(0)
  const [bottomCardIndex, setBottomCardIndex] = useState<number>(0)
  const [runningGameId, setRunningGameId] = useState<string | null>(null)
  const [isGameRunning, setIsGameRunning] = useState(false)
  const isGameRunningRef = useRef(false)
  const [clock, setClock] = useState('')
  const [modal, setModal] = useState<ModalType>(null)
  const [libraryView, setLibraryView] = useState(false)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    gameId: null
  })

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarIndex, setSidebarIndex] = useState(0)
  const [librarySource, setLibrarySource] = useState<LibrarySource>('local')
  const [selectedSteamAppId, setSelectedSteamAppId] = useState<string | null>(null)
  const [steamAccount, setSteamAccount] = useState<SteamAccount>({
    linked: false,
    apiKey: DEFAULT_STEAM_API_KEY,
    steamId: '',
    accountName: '',
    steamId64: null
  })
  const [steamFriends, setSteamFriends] = useState<SteamFriend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<SteamFriend | null>(null)
  const [selectedFriendBackground, setSelectedFriendBackground] = useState<string | null>(null)
  const [steamLibrary, setSteamLibrary] = useState<SteamLibraryGame[]>([])
  const [steamLibraryLoading, setSteamLibraryLoading] = useState(false)

  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(defaultHomeBackground)

  // Quick access apps state
  const [quickApps, setQuickApps] = useState<QuickApp[]>(getStoredQuickApps())
  // Paso intermedio: tras elegir el ejecutable, se pregunta si es Juego o Programa
  // antes de guardar (evita segunda ventana de explorador y define el comportamiento al lanzar)
  const [pendingQuickApp, setPendingQuickApp] = useState<{
    mode: 'add' | 'edit'
    editId?: string
    filePath: string
    name: string
    iconDataUrl: string | null
    autoArtworkUrl: string | null
  } | null>(null)

  // User profile state
  const [profileName, setProfileName] = useState('')
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null)

  // Add / Edit game form state
  const [formName, setFormName] = useState('')
  const [formExePath, setFormExePath] = useState('')
  const [formIconUrl, setFormIconUrl] = useState<string | null>(null)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)

  // SteamGridDB state
  const [sgdbSearch, setSgdbSearch] = useState('')
  const [sgdbResults, setSgdbResults] = useState<SteamGridGame[]>([])
  const [sgdbLoading, setSgdbLoading] = useState(false)
  const [sgdbSelectedGame, setSgdbSelectedGame] = useState<SteamGridGame | null>(null)
  const [sgdbArtType, setSgdbArtType] = useState<SteamGridArtType>('grids')
  const [sgdbImages, setSgdbImages] = useState<SteamGridImage[]>([])
  const [sgdbImagesLoading, setSgdbImagesLoading] = useState(false)
  const [sgdbTargetGameId, setSgdbTargetGameId] = useState<string | null>(null)

  // Store carousel state
  const [stores, setStores] = useState<Store[]>([])
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0)
  const [storeHover, setStoreHover] = useState(false)

  // Game details view state
  const [detailGameId, setDetailGameId] = useState<string | null>(null)
  const [detailAccent, setDetailAccent] = useState<string>('#ffffff')
  const [detailScreenshots, setDetailScreenshots] = useState<Array<{ path_full: string; path_thumbnail: string }>>([])
  const [detailLoadingShots, setDetailLoadingShots] = useState(false)
  const [detailShotIndex, setDetailShotIndex] = useState(0)
  const [detailInfo, setDetailInfo] = useState<{
    description: string | null
    developer: string | null
    publisher: string | null
    releaseDate: string | null
    reviewsRecent: { summary: string; count: number } | null
    reviewsAll: { summary: string; count: number } | null
    reviewsPositive: { summary: string; count: number } | null
    reviewsNegative: { summary: string; count: number } | null
    tags: string[]
    metacritic: { score: number; url: string | null } | null
    rating: { board: string; rating: string | null; descriptors: string[] } | null
  } | null>(null)
  const [detailInfoLoading, setDetailInfoLoading] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: window.outerWidth, height: window.outerHeight })

  const gamesRowRef = useRef<HTMLDivElement>(null)
  const libraryGridRef = useRef<HTMLDivElement>(null)
  const previousLibraryIndexRef = useRef<number | null>(null)
  const wipeDirectionRef = useRef<1 | -1>(1)

  const visibleGames = useMemo(() => getRecentGames(games), [games])
  const sortedLibraryGames = useMemo(() => sortGamesByNewestFirst(games), [games])
  const sortedSteamFriends = useMemo(
    () => [...steamFriends].sort((a, b) => Number(isFriendActive(b)) - Number(isFriendActive(a)) || a.personaname.localeCompare(b.personaname)),
    [steamFriends]
  )
  const friendsAvatarSlots = useMemo(
    () => Array.from({ length: 5 }, (_, index) => sortedSteamFriends[index] ?? null),
    [sortedSteamFriends]
  )
  const otherFriends = useMemo(
    () => sortedSteamFriends.filter((friend) => friend.steamid !== selectedFriend?.steamid),
    [selectedFriend, sortedSteamFriends]
  )
  const selectedGame = games.find((g) => g.id === selectedGameId) || null
  const selectedSteamGame = useMemo(
    () => steamLibrary.find((game) => String(game.appid) === selectedSteamAppId) ?? null,
    [selectedSteamAppId, steamLibrary]
  )
  const steamLibraryArtUrl = useCallback((appid: string): string => `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`, [])
  const librarySelectedGame = games.find((g) => g.id === selectedGameId) || games[0] || null
  const detailGame = useMemo<Game | null>(() => {
    const localGame = games.find((g) => g.id === detailGameId) || null
    if (localGame) return localGame

    if (!detailGameId || !detailGameId.startsWith('steam-')) return null

    const appid = detailGameId.replace(/^steam-/, '')
    const steamGame = steamLibrary.find((game) => String(game.appid) === appid)
    if (!steamGame) return null

    return {
      id: `steam-${steamGame.appid}`,
      name: steamGame.name,
      exePath: `steam://rungameid/${steamGame.appid}`,
      playtimeMinutes: Math.round(steamGame.playtime_forever / 60),
      lastPlayed: null,
      createdAt: new Date().toISOString(),
      color: '#66b2ff',
      steamAppId: String(steamGame.appid),
      isSteam: true,
      iconDataUrl: steamGame.iconDataUrl || null,
      gridImageUrl: steamGame.gridImageUrl || steamLibraryArtUrl(steamGame.appid),
      heroImageUrl: steamGame.heroImageUrl || steamLibraryArtUrl(steamGame.appid),
      logoImageUrl: steamGame.logoImageUrl || null
    }
  }, [detailGameId, games, steamLibrary, steamLibraryArtUrl])
  const currentLibraryItems = librarySource === 'steam' ? steamLibrary : sortedLibraryGames
  const currentLibraryCount = librarySource === 'steam' ? steamLibrary.length : games.length
  const compactDetailReviewLayout = windowSize.width < 1740 || windowSize.height < 910
  const smallDetailLayout = windowSize.width < 1366 || windowSize.height < 768
  const quickAppSlots = useMemo(() => Array.from({ length: 4 }, (_, index) => quickApps[index] ?? null), [quickApps])

  // En la vista principal de Home seguimos estando "enfocados" aunque el usuario
  // haya seleccionado un juego concreto del row: eso permite que el touchpad y la
  // navegación del mando puedan moverse también a las mini tarjetas del carp.
  const isHomeFocused =
    !libraryView && !detailGameId && modal === null && (
      selectedGameId === 'library' ||
      !selectedGameId ||
      visibleGames.some((game) => game.id === selectedGameId)
    )

  const [wallpaperFolder, setWallpaperFolder] = useState<string | null>(null)
  const [wallpaperImages, setWallpaperImages] = useState<Array<{ name: string; path: string; dataUrl: string; mtime: number }>>([])
  const [wallpaperMode, setWallpaperMode] = useState(false)
  const [wallpaperIndex, setWallpaperIndex] = useState(0)

  // Solo la card de Home (biblioteca), no juegos, bottom row ni wallpapers.
  const isHomeCardFocused =
    isHomeFocused &&
    !wallpaperMode &&
    !sidebarOpen &&
    homeCardMode === 'main' &&
    (selectedGameId === 'library' || selectedGameId === null)

  useEffect(() => {
    if (!isHomeFocused || libraryView || detailGameId || modal !== null) {
      setHomeCardMode('main')
      setBottomCardIndex(0)
    }
  }, [isHomeFocused, libraryView, detailGameId, modal])

  // ── Inactividad: 2 min en la card de Home agranda el player;
  // se vuelve a encoger solo al presionar fuera del reproductor (no por cualquier movimiento)
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preserveIdleRef = useRef(false)

  const showIdleMode = isIdle && isHomeCardFocused

  const scheduleIdle = useCallback(() => {
    if (!isHomeCardFocused) return
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setIsIdle(true), 120000)
  }, [isHomeCardFocused])

  const exitIdle = useCallback(() => {
    setIsIdle(false)
    scheduleIdle()
  }, [scheduleIdle])

  const enterHomeIdle = useCallback(() => {
    preserveIdleRef.current = true
    setLibraryView(false)
    setDetailGameId(null)
    setModal(null)
    setSidebarOpen(false)
    setWallpaperMode(false)
    setHomeCardMode('main')
    setSelectedGameId('library')
    setIsIdle(true)
  }, [])

  // Antes de estar en idle: cualquier actividad retrasa el agrandado, pero no lo encoge
  useEffect(() => {
    if (showIdleMode) return
    if (!isHomeCardFocused) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      return
    }
    scheduleIdle()
    const resetOnly = (): void => {
      // solo reprograma el timer, no toca isIdle (que ya es false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setIsIdle(true), 120000)
    }
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, resetOnly, { passive: true }))
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetOnly))
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [scheduleIdle, showIdleMode, isHomeCardFocused])

  // En idle: solo un click/touch fuera del reproductor lo encoge
  useEffect(() => {
    if (!showIdleMode) return
    const handleOutside = (e: Event): void => {
      const target = e.target as HTMLElement | null
      if (!target) return
      // si el click cae dentro del reproductor, no hacer nada
      if (target.closest('.music-player, .music-player-wrapper')) return
      exitIdle()
    }
    // click + touch para cubrir desktop/touch
    window.addEventListener('click', handleOutside, true)
    window.addEventListener('touchstart', handleOutside, true)
    // también permitir Esc para salir si el usuario lo espera
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') exitIdle()
    }
    window.addEventListener('keydown', handleEsc)
    return () => {
      window.removeEventListener('click', handleOutside, true)
      window.removeEventListener('touchstart', handleOutside, true)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [showIdleMode, exitIdle])

  // Salir de idle al dejar la card de Home / modal / biblioteca
  useEffect(() => {
    if (preserveIdleRef.current) {
      preserveIdleRef.current = false
      return
    }
    if (modal !== null || detailGameId || libraryView || !isHomeCardFocused) setIsIdle(false)
  }, [modal, detailGameId, libraryView, isHomeCardFocused])

  // ── Friends card: música actual para botón Fecha + estado del control ──
  const { nowPlaying: friendsNowPlaying } = useSystemMedia(isGameRunning)
  const friendsMusicTitle = friendsNowPlaying?.title?.trim() ? friendsNowPlaying.title : 'Sin música'
  const [isControllerConnected, setIsControllerConnected] = useState(false)
  const controllerStateRef = useRef<boolean | null>(null)
  useGamepadNavigation(isControllerConnected && !runningGameId && !isGameRunning)
  useEffect(() => {
    const syncControllerStatus = (connected: boolean): void => {
      if (controllerStateRef.current === connected) {
        setIsControllerConnected(connected)
        return
      }
      controllerStateRef.current = connected
      setIsControllerConnected(connected)
      if (connected) {
        playControllerConnected()
      } else {
        playControllerDisconnected()
      }
    }

    const check = (): void => {
      if (isGameRunningRef.current) return
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : []
        const connected = Array.from(pads || []).some((p) => !!p)
        syncControllerStatus(connected)
      } catch {
        syncControllerStatus(false)
      }
    }

    check()
    const onConnect = (): void => syncControllerStatus(true)
    const onDisconnect = (): void => check()
    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)
    const interval = window.setInterval(check, 1500)
    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
      window.clearInterval(interval)
    }
  }, [])

  // ── Wallpaper folder — W (solo Home) / artwork en juego ──
  const wallpaperRowRef = useRef<HTMLDivElement>(null)
  const isWallpaperMode = wallpaperMode && isHomeFocused && wallpaperImages.length > 0
  const selectedWallpaper = isWallpaperMode ? wallpaperImages[wallpaperIndex] ?? null : null

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const folder = await window.api.getWallpaperFolder()
        if (folder) {
          setWallpaperFolder(folder)
          const imgs = await window.api.getWallpaperImages(folder)
          setWallpaperImages(imgs)
        }
      } catch { }
    }
    load()
  }, [])

  useEffect(() => {
    if (!isHomeFocused) setWallpaperMode(false)
  }, [isHomeFocused])

  useEffect(() => {
    if (!isWallpaperMode || !wallpaperRowRef.current) return
    const target = document.getElementById(`wallpaper-card-${wallpaperIndex}`)
    if (!target) return
    const row = wallpaperRowRef.current
    const targetTop = target.offsetTop
    const targetHeight = target.offsetHeight
    const rowHeight = row.clientHeight
    const desiredTop = targetTop - (rowHeight - targetHeight) / 2
    row.scrollTo({ top: Math.max(0, desiredTop), behavior: 'smooth' })
  }, [wallpaperIndex, isWallpaperMode, wallpaperImages])

  // ── Clock ──
  useEffect(() => {
    const tick = (): void => {
      if (isGameRunningRef.current) return
      const now = new Date()
      setClock(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])



  // ── Track current window size for compact detail layout ──
  useEffect(() => {
    const updateWindowSize = (): void => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateWindowSize()
    window.addEventListener('resize', updateWindowSize)
    return () => window.removeEventListener('resize', updateWindowSize)
  }, [])

  // ── Load games from disk ──
  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const stored = await window.api.getGames()
        if (Array.isArray(stored) && stored.length > 0) {
          const normalizedGames = stored.map((game) => ({
            ...game,
            createdAt: game.createdAt || game.lastPlayed || new Date().toISOString()
          }))
          setGames(normalizedGames)
          setSelectedGameId('library')
        }
      } catch (err) {
        console.error('Error loading games:', err)
      }
    }
    load()
  }, [])

  // ── Load background image ──
  useEffect(() => {
    const loadBg = async (): Promise<void> => {
      try {
        const bg = await window.api.getBackgroundImage()
        if (bg) setBackgroundImage(bg)
      } catch (err) {
        console.error('Error loading background:', err)
      }
    }
    loadBg()
  }, [])

  // ── Load user profile ──
  useEffect(() => {
    const loadProfile = async (): Promise<void> => {
      try {
        const profile = await window.api.getProfile()
        if (profile) {
          setProfileName(profile.name || '')
          setProfileAvatar(profile.avatar || null)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      }
    }
    loadProfile()
  }, [])

  // ── Load installed stores ──
  useEffect(() => {
    const loadStores = async (): Promise<void> => {
      try {
        const storeList = await window.api.getStores()
        if (Array.isArray(storeList) && storeList.length > 0) {
          setStores(storeList)
          setCurrentStoreIndex(0)
        }
      } catch (err) {
        console.error('Error loading stores:', err)
      }
    }
    loadStores()
  }, [])

  // ── Load Steam linkage and library ──
  useEffect(() => {
    const loadSteamAccount = async (): Promise<void> => {
      try {
        const account = await window.api.getSteamAccount()
        setSteamAccount({
          linked: !!account?.linked,
          apiKey: account?.apiKey || DEFAULT_STEAM_API_KEY,
          steamId: account?.steamId || '',
          accountName: account?.accountName || '',
          steamId64: account?.steamId64 || null
        })
      } catch (err) {
        console.error('Error loading Steam account:', err)
      }
    }
    loadSteamAccount()
  }, [])

  const loadSteamLibrary = useCallback(async (): Promise<void> => {
    if (!steamAccount.linked || !steamAccount.apiKey || !steamAccount.steamId) return

    setSteamLibraryLoading(true)
    try {
      const query = new URLSearchParams({
        key: steamAccount.apiKey,
        steamId: steamAccount.steamId
      })

      const res = await fetch(`${BACKEND_URL}/api/steam/library?${query.toString()}`)
      if (!res.ok) return
      const games = await res.json()
      const normalizedGames = (Array.isArray(games) ? games : []).map((game: SteamLibraryGame) => ({
        ...game,
        appid: String(game.appid),
        installed: Boolean(game.installed),
        ...(getStoredSteamArtwork()[String(game.appid)] || {})
      }))

      const appIds = normalizedGames.map((game) => game.appid)
      const installStatus = await window.api.getSteamInstallationStatus(appIds)
      const finalGames = normalizedGames.map((game) => ({
        ...game,
        installed: Boolean(installStatus[game.appid]) || Boolean(game.installed)
      }))

      setSteamLibrary(finalGames)
      if (librarySource === 'steam' && finalGames.length > 0) {
        setSelectedSteamAppId(String(finalGames[0].appid))
      }
    } catch (err) {
      console.error('Error loading Steam library:', err)
      setSteamLibrary([])
    } finally {
      setSteamLibraryLoading(false)
    }
  }, [librarySource, steamAccount])

  const loadSteamFriends = useCallback(async (): Promise<void> => {
    if (!steamAccount.linked || !steamAccount.apiKey || !steamAccount.steamId) {
      setSteamFriends([])
      return
    }

    try {
      const query = new URLSearchParams({
        key: steamAccount.apiKey,
        steamId: steamAccount.steamId
      })

      const res = await fetch(`${BACKEND_URL}/api/steam/friends?${query.toString()}`)
      if (!res.ok) {
        setSteamFriends([])
        return
      }

      const friends = await res.json()
      const normalizedFriends = (Array.isArray(friends) ? friends : [])
        .map((friend: SteamFriend) => ({
          steamid: String(friend.steamid),
          personaname: friend.personaname || 'Steam friend',
          avatar: friend.avatar || null,
          avatarfull: friend.avatarfull || friend.avatar || null,
          profileurl: friend.profileurl || null,
          personastate: Number(friend.personastate || 0),
          gameid: friend.gameid || null,
          gameextrainfo: friend.gameextrainfo || null
        }))
        .filter((friend) => Boolean(friend.avatarfull))

      setSteamFriends(normalizedFriends)
    } catch (err) {
      console.error('Error loading Steam friends:', err)
      setSteamFriends([])
    }
  }, [steamAccount])

  useEffect(() => {
    if (steamAccount.linked) {
      void loadSteamLibrary()
      void loadSteamFriends()
      const friendsRefresh = window.setInterval(() => { void loadSteamFriends() }, 30000)
      return () => window.clearInterval(friendsRefresh)
    } else {
      setSteamLibrary([])
      setSteamFriends([])
      setSelectedSteamAppId(null)
    }
    return undefined
  }, [steamAccount, loadSteamLibrary, loadSteamFriends])

  useEffect(() => {
    if (!selectedFriend) {
      setSelectedFriendBackground(null)
      return
    }

    let cancelled = false
    setSelectedFriendBackground(null)
    fetch(`${BACKEND_URL}/api/steam/friends/${selectedFriend.steamid}/background`)
      .then((response) => response.ok ? response.json() : null)
      .then((data: { background?: string | null } | null) => {
        if (!cancelled) setSelectedFriendBackground(data?.background || null)
      })
      .catch(() => {
        if (!cancelled) setSelectedFriendBackground(null)
      })

    return () => { cancelled = true }
  }, [selectedFriend])

  // ── Store carousel auto-advance (paused on hover) ──
  useEffect(() => {
    if (stores.length <= 1 || storeHover) return
    const interval = setInterval(() => {
      if (isGameRunningRef.current) return
      setCurrentStoreIndex((prev) => (prev + 1) % stores.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [stores.length, storeHover])

  // ── Listen for game-exited events from main process ──
  useEffect(() => {
    const unsubscribe = window.api.onGameExited((data) => {
      setRunningGameId(null)
      setIsGameRunning(false)
      isGameRunningRef.current = false
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

  // ── Listen for game-session-start (launcher hides, suspend activities) ──
  useEffect(() => {
    const unsubscribe = window.api.onGameSessionStart(() => {
      isGameRunningRef.current = true
      setIsGameRunning(true)
    })
    return unsubscribe
  }, [])

  // ── Extract an accent color from the detail game's hero image ──
  useEffect(() => {
    if (!detailGame?.heroImageUrl) {
      setDetailAccent('#0c0c0c')
      return
    }
    let cancelled = false
    const img = new Image()
    // NOTE: intentionally NOT setting img.crossOrigin — most image CDNs (SteamGridDB
    // included) don't send Access-Control-Allow-Origin, so requesting CORS mode just
    // makes the browser refuse to load the image at all. Loading it "normally" instead
    // taints the canvas, which means getImageData() below will throw a SecurityError —
    // that's expected and handled by the catch block, which falls back to a neutral color.
    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        const w = (canvas.width = 32)
        const h = (canvas.height = 32)
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        // Sample the lower portion of the image, which is where the gradient blends in
        for (let y = Math.floor(h * 0.55); y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
          }
        }
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        if (!cancelled) setDetailAccent(`rgb(${r}, ${g}, ${b})`)
      } catch {
        // Canvas is tainted by a cross-origin image with no CORS headers — expected, fall back silently.
        if (!cancelled) setDetailAccent('#0c0c0c')
      }
    }
    img.onerror = () => {
      if (!cancelled) setDetailAccent('#0c0c0c')
    }
    img.src = detailGame.heroImageUrl
    return () => {
      cancelled = true
    }
  }, [detailGame?.heroImageUrl])

  // ── Fetch Steam screenshots + details for the detail game ──
  useEffect(() => {
    if (!detailGame) {
      setDetailScreenshots([])
      setDetailInfo(null)
      setDetailShotIndex(0)
      return
    }
    let cancelled = false
    const loadDetails = async (): Promise<void> => {
      setDetailLoadingShots(true)
      setDetailInfoLoading(true)
      setDetailScreenshots([])
      setDetailInfo(null)
      setDetailShotIndex(0)
      try {
        // Steam entries already carry their AppID; local games still resolve by name.
        let appid = detailGame.steamAppId
        if (!appid) {
          const resolveRes = await fetch(
            `${BACKEND_URL}/api/steam/resolve?term=${encodeURIComponent(detailGame.name)}`
          )
          if (!resolveRes.ok) return
          const resolved = await resolveRes.json()
          appid = resolved?.appid
        }
        if (!appid) return

        // 2) Fetch screenshots and store details in parallel
        const [shotsRes, detailsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/steam/screenshots/${appid}`),
          fetch(`${BACKEND_URL}/api/steam/details/${appid}`)
        ])

        if (!cancelled && shotsRes.ok) {
          const shots = await shotsRes.json()
          if (Array.isArray(shots)) setDetailScreenshots(shots)
        }
        if (!cancelled && detailsRes.ok) {
          const details = await detailsRes.json()
          if (details) setDetailInfo(details)
        }
      } catch (err) {
        console.error('Error obteniendo información de Steam:', err)
      } finally {
        if (!cancelled) {
          setDetailLoadingShots(false)
          setDetailInfoLoading(false)
        }
      }
    }
    loadDetails()
    return () => {
      cancelled = true
    }
  }, [detailGameId])

  // ── Close detail view with Escape (sonido close) ──
  useEffect(() => {
    if (!detailGameId) return
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        playClose()
        setDetailGameId(null)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [detailGameId])

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

  const saveQuickApps = useCallback((newApps: QuickApp[]) => {
    setQuickApps(newApps)
    localStorage.setItem(QUICK_APPS_STORAGE_KEY, JSON.stringify(newApps))
  }, [])

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

  // Solo abre el explorador de archivos UNA vez. El artwork se resuelve
  // automáticamente (SteamGridDB / icono del .exe); ya no se pide una segunda
  // imagen manualmente aquí (eso generaba el "segundo explorador").
  const handleAddQuickApp = useCallback(async () => {
    const filePath = await window.api.selectGameFile()
    if (!filePath) return

    const iconDataUrl = await window.api.getFileIcon(filePath)
    const fileName = filePath.split(/[\\/]/).pop() || 'App'
    const appName = fileName.replace(/\.[^.]+$/, '') || 'App'
    const autoArtworkUrl = await fetchAutoArtworkUrl(appName)

    setPendingQuickApp({
      mode: 'add',
      filePath,
      name: appName,
      iconDataUrl: iconDataUrl || null,
      autoArtworkUrl
    })
  }, [])

  const handleEditQuickApp = useCallback(async (appId: string) => {
    const target = quickApps.find((app) => app.id === appId)
    if (!target) return

    const filePath = await window.api.selectGameFile()
    if (!filePath) return

    const iconDataUrl = await window.api.getFileIcon(filePath)
    const appName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || target.name
    const autoArtworkUrl = await fetchAutoArtworkUrl(appName)

    setPendingQuickApp({
      mode: 'edit',
      editId: appId,
      filePath,
      name: appName,
      iconDataUrl: iconDataUrl || target.iconDataUrl || null,
      autoArtworkUrl
    })
  }, [quickApps])

  // Confirma el tipo (Juego / Programa) elegido en el modal y persiste la app rápida
  const finalizeQuickApp = useCallback((kind: QuickAppKind) => {
    if (!pendingQuickApp) return

    if (pendingQuickApp.mode === 'add') {
      const newApp: QuickApp = {
        id: generateId(),
        name: pendingQuickApp.name,
        exePath: pendingQuickApp.filePath,
        artworkUrl: pendingQuickApp.autoArtworkUrl || pendingQuickApp.iconDataUrl || null,
        iconDataUrl: pendingQuickApp.iconDataUrl,
        lastPlayed: null,
        createdAt: new Date().toISOString(),
        kind
      }
      saveQuickApps([...quickApps, newApp])
    } else if (pendingQuickApp.editId) {
      const updatedApps = quickApps.map((app) => app.id === pendingQuickApp.editId
        ? {
          ...app,
          name: pendingQuickApp.name,
          exePath: pendingQuickApp.filePath,
          iconDataUrl: pendingQuickApp.iconDataUrl || app.iconDataUrl,
          artworkUrl: pendingQuickApp.autoArtworkUrl || app.artworkUrl,
          kind
        }
        : app)
      saveQuickApps(updatedApps)
    }

    setPendingQuickApp(null)
  }, [pendingQuickApp, quickApps, saveQuickApps])

  const handleLaunchQuickApp = useCallback(async (app: QuickApp) => {
    const now = new Date().toISOString()

    // Programas: se abren directo, sin crear una entrada en "games", así que
    // nunca aparecen en el row de recientes/biblioteca y por lo tanto nunca
    // disparan el Detail View de juegos.
    if (app.kind === 'program') {
      saveQuickApps(quickApps.map((a) => (a.id === app.id ? { ...a, lastPlayed: now } : a)))
      playEnter()
      try {
        await window.api.launchGame(`quick-${app.id}`, app.exePath)
      } catch (err) {
        console.error('Error launching program:', err)
      }
      return
    }

    // Juegos: comportamiento original — crean/actualizan una entrada en "games"
    // (id `quick-<id>`) para que aparezcan en recientes y puedan abrir el Detail View.
    const quickGameId = `quick-${app.id}`
    const newGame: Game = {
      id: quickGameId,
      name: app.name,
      exePath: app.exePath,
      iconDataUrl: app.iconDataUrl,
      playtimeMinutes: 0,
      lastPlayed: now,
      createdAt: now,
      color: randomColor(),
      gridImageUrl: app.artworkUrl || app.iconDataUrl || null,
      heroImageUrl: app.artworkUrl || app.iconDataUrl || null,
      logoImageUrl: null,
      steamAppId: null,
      isSteam: false
    }

    setGames((prevGames) => {
      const existingIndex = prevGames.findIndex((g) => g.id === quickGameId)
      const updatedGames = existingIndex >= 0
        ? prevGames.map((g) => g.id === quickGameId ? { ...g, ...newGame, lastPlayed: now } : g)
        : [...prevGames, newGame]

      window.api.saveGames(updatedGames)
      return updatedGames
    })

    saveQuickApps(quickApps.map((a) => (a.id === app.id ? { ...a, lastPlayed: now } : a)))
    setSelectedGameId(quickGameId)
    setRunningGameId(quickGameId)
    playEnterGame()

    try {
      await window.api.launchGame(quickGameId, app.exePath)
    } catch (err) {
      console.error('Error launching quick app:', err)
      setRunningGameId(null)
    }
  }, [quickApps, saveQuickApps])

  // ── Add game ──
  const handleAddGame = useCallback(async () => {
    if (!formName.trim()) return
    const newGame: Game = {
      id: generateId(),
      name: formName.trim(),
      exePath: formExePath.trim(),
      iconDataUrl: formIconUrl,
      playtimeMinutes: 0,
      lastPlayed: null,
      createdAt: new Date().toISOString(),
      color: randomColor(),
      steamGridId: null,
      gridImageUrl: null,
      heroImageUrl: null,
      logoImageUrl: null
    }

    // Auto-fetch artwork
    try {
      const searchRes = await fetch(`${BACKEND_URL}/api/steamgrid/search?term=${encodeURIComponent(newGame.name)}`)
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (Array.isArray(searchData) && searchData.length > 0) {
          const gameId = searchData[0].id
          newGame.steamGridId = gameId

          const [squareGridsRes, gridsRes, heroesRes, logosRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/steamgrid/square_grids/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/grids/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/heroes/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/logos/${gameId}`)
          ])

          if (squareGridsRes.ok) {
            const squareGrids = await squareGridsRes.json()
            if (squareGrids && squareGrids.length > 0) newGame.gridImageUrl = squareGrids[0].url
          }
          if (!newGame.gridImageUrl && gridsRes.ok) {
            const grids = await gridsRes.json()
            if (grids && grids.length > 0) newGame.gridImageUrl = grids[0].url
          }
          if (heroesRes.ok) {
            const heroes = await heroesRes.json()
            if (heroes && heroes.length > 0) newGame.heroImageUrl = heroes[0].url
          }
          if (logosRes.ok) {
            const logos = await logosRes.json()
            if (logos && logos.length > 0) newGame.logoImageUrl = logos[0].url
          }
        }
      }
    } catch (err) {
      console.error('Error auto-fetching artwork:', err)
    }

    setGames((prevGames) => {
      const newGames = [...prevGames, newGame]
      window.api.saveGames(newGames)
      return newGames
    })
    setSelectedGameId(newGame.id)
    setModal(null)
    resetForm()
  }, [formName, formExePath, formIconUrl])

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
  const handleLaunchGame = useCallback(async (overrideGameId?: string) => {
    // Resolver objetivo: prioriza override (corrige bug de estado stale en Steam), luego detail, luego selección
    let launchTarget: Game | null = null

    const resolveSteamTarget = (appid: string): Game | null => {
      const steamG = steamLibrary.find((g) => String(g.appid) === String(appid))
      if (!steamG) return null
      const installed = Boolean(steamG.installed)
      return {
        id: `steam-${steamG.appid}`,
        name: steamG.name,
        exePath: installed ? `steam://rungameid/${steamG.appid}` : `steam://install/${steamG.appid}`,
        playtimeMinutes: Math.round(steamG.playtime_forever / 60),
        lastPlayed: null,
        createdAt: new Date().toISOString(),
        color: '#66b2ff',
        steamAppId: String(steamG.appid),
        isSteam: true,
        iconDataUrl: steamG.iconDataUrl || null,
        gridImageUrl: steamG.gridImageUrl || steamLibraryArtUrl(steamG.appid),
        heroImageUrl: steamG.heroImageUrl || steamLibraryArtUrl(steamG.appid),
        logoImageUrl: steamG.logoImageUrl || null
      } as Game
    }

    if (overrideGameId) {
      if (overrideGameId.startsWith('steam-')) {
        launchTarget = resolveSteamTarget(overrideGameId.replace(/^steam-/, '')) ?? detailGame
      } else {
        launchTarget = games.find((g) => g.id === overrideGameId) ?? null
      }
    } else if (detailGame) {
      // Si hay detalle abierto, ese es el objetivo (corrige Steam que abría otro juego)
      if (detailGame.isSteam) {
        const steamResolved = resolveSteamTarget(String(detailGame.steamAppId || detailGame.id.replace(/^steam-/, '')))
        launchTarget = steamResolved ?? detailGame
        // asegurar exePath correcto según instalado
        if (launchTarget && launchTarget.isSteam) {
          const appid = String(launchTarget.steamAppId || '')
          const inst = steamLibrary.some((g) => String(g.appid) === appid && g.installed)
          launchTarget = { ...launchTarget, exePath: inst ? `steam://rungameid/${appid}` : `steam://install/${appid}` }
        }
      } else {
        launchTarget = detailGame
      }
    } else if (libraryView && librarySource === 'steam' && selectedSteamGame) {
      launchTarget = resolveSteamTarget(selectedSteamGame.appid)
    } else {
      launchTarget = selectedGame ?? (selectedSteamGame ? resolveSteamTarget(selectedSteamGame.appid) : null)
    }

    if (!launchTarget) return

    playEnterGame()

    if (!launchTarget.isSteam) {
      setGames((prev) => {
        if (!prev.some((g) => g.id === launchTarget!.id)) return prev
        const updated = prev.map((g) =>
          g.id === launchTarget!.id ? { ...g, lastPlayed: new Date().toISOString() } : g
        )
        window.api.saveGames(updated)
        return updated
      })
    } else {
      const appid = String(launchTarget.steamAppId || launchTarget.id.replace(/^steam-/, ''))
      const inst = steamLibrary.some((g) => String(g.appid) === appid && g.installed)
      const steamGame = steamLibrary.find((g) => String(g.appid) === appid)
      const now = new Date().toISOString()
      launchTarget = { ...launchTarget, exePath: inst ? `steam://rungameid/${appid}` : `steam://install/${appid}` }
      setGames((prev) => {
        const entry: Game = {
          id: `steam-${appid}`,
          name: steamGame?.name || launchTarget!.name,
          exePath: launchTarget!.exePath,
          iconDataUrl: steamGame?.iconDataUrl || launchTarget!.iconDataUrl || null,
          playtimeMinutes: launchTarget!.playtimeMinutes,
          lastPlayed: now,
          createdAt: now,
          color: launchTarget!.color,
          steamAppId: appid,
          isSteam: true,
          gridImageUrl: launchTarget!.gridImageUrl || steamGame?.gridImageUrl || steamLibraryArtUrl(appid),
          heroImageUrl: launchTarget!.heroImageUrl || steamGame?.heroImageUrl || steamLibraryArtUrl(appid),
          logoImageUrl: launchTarget!.logoImageUrl || steamGame?.logoImageUrl || null
        }

        const updated = prev.some((g) => g.id === entry.id)
          ? prev.map((g) => g.id === entry.id ? { ...g, ...entry, lastPlayed: now } : g)
          : [...prev, entry]

        window.api.saveGames(updated)
        return updated
      })
    }

    setRunningGameId(launchTarget.id)
    try {
      await window.api.launchGame(launchTarget.id, launchTarget.exePath)
    } catch (err) {
      console.error('Error launching game:', err)
      setRunningGameId(null)
    }
  }, [selectedGame, selectedSteamGame, steamLibrary, steamLibraryArtUrl, games, detailGame, libraryView, librarySource])

  // ── Open specs modal ──
  const handleOpenSpecs = useCallback(async () => {
    try {
      playEnter()
      const info = await window.api.getSystemInfo()
      setSystemInfo(info)
      setModal('specs')
    } catch (err) {
      console.error('Error fetching system info:', err)
    }
  }, [])

  // ── Open add game modal ──
  const openAddGameModal = useCallback(() => {
    playEnter()
    resetForm()
    setModal('addGame')
  }, [])

  const openLibraryView = useCallback(() => {
    playEnter()
    setDetailGameId(null)
    setSelectedGameId(games[0]?.id ?? null)
    setLibraryView(true)
  }, [games])

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

  // ── Background image handlers ──
  const handleSelectBackground = useCallback(async () => {
    try {
      const dataUrl = await window.api.selectBackgroundImage()
      if (dataUrl) {
        setBackgroundImage(dataUrl)
      }
    } catch (err) {
      console.error('Error selecting background:', err)
    }
  }, [])

  const handleClearBackground = useCallback(async () => {
    try {
      await window.api.clearBackgroundImage()
      setBackgroundImage(null)
    } catch (err) {
      console.error('Error clearing background:', err)
    }
  }, [])

  // ── Profile handlers ──
  const handleSelectProfileImage = useCallback(async () => {
    try {
      const dataUrl = await window.api.selectProfileImage()
      if (dataUrl) {
        setProfileAvatar(dataUrl)
        await window.api.saveProfile({ name: profileName, avatar: dataUrl })
      }
    } catch (err) {
      console.error('Error selecting profile image:', err)
    }
  }, [profileName])

  const handleSaveProfileName = useCallback(
    async (name: string) => {
      setProfileName(name)
      await window.api.saveProfile({ name, avatar: profileAvatar })
    },
    [profileAvatar]
  )

  // ── Store carousel handlers ──
  const handleOpenStore = useCallback(
    async (storeId: string) => {
      const store = stores.find((s) => s.id === storeId)
      if (!store || !store.installed) return
      try {
        await window.api.openStore(storeId)
      } catch (err) {
        console.error('Error opening store:', err)
      }
    },
    [stores]
  )

  const handleStoreSelect = useCallback((index: number) => {
    setCurrentStoreIndex(index)
  }, [])

  const handleSteamOpenIdLink = useCallback(async () => {
    try {
      const result = await window.api.openSteamOpenId()
      if (!result?.linked || !result.steamId) {
        return
      }

      const payload = {
        linked: true,
        apiKey: result.apiKey || DEFAULT_STEAM_API_KEY,
        steamId: result.steamId,
        accountName: result.accountName || result.steamId,
        steamId64: result.steamId64 || result.steamId
      }

      await window.api.saveSteamAccount(payload)
      setSteamAccount(payload)
      setLibrarySource('steam')
      setModal(null)
    } catch (err) {
      console.error('Error vinculando Steam con OpenID:', err)
    }
  }, [])

  const handleSteamUnlink = useCallback(async () => {
    const payload = {
      linked: false,
      apiKey: DEFAULT_STEAM_API_KEY,
      steamId: '',
      accountName: '',
      steamId64: null
    }
    await window.api.saveSteamAccount(payload)
    setSteamAccount(payload)
    setLibrarySource('local')
  }, [])

  // ── SteamGridDB handlers ──
  const handleSgdbSearch = useCallback(async () => {
    if (!sgdbSearch.trim()) return
    setSgdbLoading(true)
    setSgdbResults([])
    setSgdbSelectedGame(null)
    setSgdbImages([])
    try {
      const res = await fetch(`${BACKEND_URL}/api/steamgrid/search?term=${encodeURIComponent(sgdbSearch.trim())}`)
      if (!res.ok) throw new Error('Error buscando en SteamGridDB')
      const data = await res.json()
      setSgdbResults(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('SteamGridDB search error:', err)
    } finally {
      setSgdbLoading(false)
    }
  }, [sgdbSearch])

  const handleSgdbSelectGame = useCallback(async (game: SteamGridGame) => {
    setSgdbSelectedGame(game)
    setSgdbImagesLoading(true)
    setSgdbImages([])
    try {
      const res = await fetch(`${BACKEND_URL}/api/steamgrid/${sgdbArtType}/${game.id}`)
      if (!res.ok) throw new Error('Error obteniendo imágenes')
      const data = await res.json()
      setSgdbImages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('SteamGridDB images error:', err)
    } finally {
      setSgdbImagesLoading(false)
    }
  }, [sgdbArtType])

  const handleSgdbChangeArtType = useCallback(async (type: SteamGridArtType) => {
    setSgdbArtType(type)
    if (!sgdbSelectedGame) return
    setSgdbImagesLoading(true)
    setSgdbImages([])
    try {
      const res = await fetch(`${BACKEND_URL}/api/steamgrid/${type}/${sgdbSelectedGame.id}`)
      if (!res.ok) throw new Error('Error obteniendo imágenes')
      const data = await res.json()
      setSgdbImages(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('SteamGridDB images error:', err)
    } finally {
      setSgdbImagesLoading(false)
    }
  }, [sgdbSelectedGame])

  const handleSgdbApplyImage = useCallback((image: SteamGridImage) => {
    if (!sgdbTargetGameId || !sgdbSelectedGame) return
    const artField = (sgdbArtType === 'grids' || sgdbArtType === 'square_grids') ? 'gridImageUrl'
      : sgdbArtType === 'heroes' ? 'heroImageUrl'
        : sgdbArtType === 'logos' ? 'logoImageUrl'
          : 'iconDataUrl'

    if (sgdbTargetGameId.startsWith('steam-')) {
      const steamAppId = sgdbTargetGameId.replace(/^steam-/, '')
      setSteamLibrary((previousGames) => previousGames.map((game) =>
        String(game.appid) === steamAppId
          ? { ...game, [artField]: image.url, ...(sgdbArtType === 'square_grids' ? { gridImageUrl: image.url } : {}) }
          : game
      ))
      const artwork = getStoredSteamArtwork()
      artwork[steamAppId] = {
        ...(artwork[steamAppId] || {}),
        [artField]: image.url,
        ...(sgdbArtType === 'square_grids' ? { gridImageUrl: image.url } : {})
      }
      localStorage.setItem(STEAM_ARTWORK_STORAGE_KEY, JSON.stringify(artwork))
      setModal(null)
      setSgdbSearch('')
      setSgdbResults([])
      setSgdbSelectedGame(null)
      setSgdbImages([])
      setSgdbTargetGameId(null)
      return
    }

    if (sgdbTargetGameId.startsWith('quick-')) {
      const quickId = sgdbTargetGameId.replace(/^quick-/, '')

      // Solo la portada/artwork principal debe afectar a la tarjeta rápida.
      // Logo e icono son variantes auxiliares y no deben reemplazar la portada.
      const quickCoverUpdate = artField === 'iconDataUrl'
        ? { iconDataUrl: image.url }
        : artField === 'logoImageUrl'
          ? {}
          : { artworkUrl: image.url }

      const updatedApps = quickApps.map((app) =>
        app.id === quickId
          ? {
            ...app,
            ...quickCoverUpdate
          }
          : app
      )
      saveQuickApps(updatedApps)

      // 2) Si ya se lanzó antes (existe como Game con id `quick-<id>`), sincroniza
      //    también esa entrada para que el Hero/Detail view reflejen el mismo artwork.
      if (games.some((g) => g.id === sgdbTargetGameId)) {
        const syncedGames = games.map((g) =>
          g.id === sgdbTargetGameId
            ? {
              ...g,
              [artField]: image.url,
              ...((sgdbArtType === 'grids' || sgdbArtType === 'square_grids') ? { gridImageUrl: image.url } : {})
            }
            : g
        )
        saveGames(syncedGames)
      }

      setModal(null)
      setSgdbSearch('')
      setSgdbResults([])
      setSgdbSelectedGame(null)
      setSgdbImages([])
      setSgdbTargetGameId(null)
      return
    }

    const newGames = games.map((g) =>
      g.id === sgdbTargetGameId
        ? {
          ...g,
          [artField]: image.url,
          steamGridId: sgdbSelectedGame.id,
          // Also set the grid as the card image if it's a grid or square_grid
          ...((sgdbArtType === 'grids' || sgdbArtType === 'square_grids') ? { gridImageUrl: image.url } : {}),
          ...(sgdbArtType === 'icons' ? { iconDataUrl: image.url } : {})
        }
        : g
    )
    saveGames(newGames)
    setModal(null)
    setSgdbSearch('')
    setSgdbResults([])
    setSgdbSelectedGame(null)
    setSgdbImages([])
    setSgdbTargetGameId(null)
  }, [sgdbTargetGameId, sgdbSelectedGame, sgdbArtType, games, saveGames, quickApps, saveQuickApps])

  const openSteamGridModal = useCallback((gameId: string) => {
    if (gameId.startsWith('steam-')) {
      const steamAppId = gameId.replace(/^steam-/, '')
      const steamGame = steamLibrary.find((game) => String(game.appid) === steamAppId)
      if (!steamGame) return
      setSgdbTargetGameId(gameId)
      setSgdbSearch(steamGame.name)
      setSgdbArtType('grids')
      setSgdbResults([])
      setSgdbSelectedGame(null)
      setSgdbImages([])
      setModal('steamgrid')
      return
    }

    if (gameId.startsWith('quick-')) {
      // La app rápida es la fuente de verdad del nombre/artwork, exista o no
      // todavía una entrada en "games" (solo se crea al lanzarla la primera vez).
      const quickId = gameId.replace(/^quick-/, '')
      const quickApp = quickApps.find((app) => app.id === quickId)
      if (!quickApp) return
      setSgdbTargetGameId(gameId)
      setSgdbSearch(quickApp.name)
      setSgdbArtType('grids')
      setSgdbResults([])
      setSgdbSelectedGame(null)
      setSgdbImages([])
      setModal('steamgrid')
      return
    }

    const game = games.find((g) => g.id === gameId)
    if (!game) return
    setSgdbTargetGameId(gameId)
    setSgdbSearch(game.name)
    setSgdbArtType('grids')
    setSgdbResults([])
    setSgdbSelectedGame(null)
    setSgdbImages([])
    setModal('steamgrid')
  }, [games, steamLibrary, quickApps])

  const handleWallpaperButton = useCallback(async () => {
    // En juego: mismo botón edita artwork del juego enfocado
    if (!isHomeFocused) {
      const targetId = detailGameId ?? (selectedGameId && selectedGameId !== 'library' ? selectedGameId : null) ?? (selectedGame ? selectedGame.id : null) ?? (detailGame ? detailGame.id : null)
      if (targetId) {
        openSteamGridModal(targetId)
      }
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
      return
    }
    // En Home: toggle row de wallpapers (solo Home)
    if (wallpaperFolder && wallpaperImages.length > 0) {
      setWallpaperMode((v) => !v)
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
      return
    }
    try {
      const res = await window.api.selectWallpaperFolder()
      if (res?.folder && Array.isArray(res.images)) {
        setWallpaperFolder(res.folder)
        setWallpaperImages(res.images)
        setWallpaperIndex(0)
        setWallpaperMode(true)
      } else if (res?.folder) {
        const imgs = await window.api.getWallpaperImages(res.folder)
        setWallpaperFolder(res.folder)
        setWallpaperImages(imgs)
        setWallpaperIndex(0)
        if (imgs.length > 0) setWallpaperMode(true)
      }
    } catch (err) {
      console.error('Error seleccionando carpeta de wallpapers:', err)
    } finally {
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
    }
  }, [isHomeFocused, detailGameId, selectedGameId, selectedGame, detailGame, wallpaperFolder, wallpaperImages.length, openSteamGridModal])

  const handleChooseWallpaperAsHome = useCallback(async (idx?: number) => {
    const targetIdx = typeof idx === 'number' ? idx : wallpaperIndex
    const img = wallpaperImages[targetIdx]
    if (!img) return
    try {
      const dataUrl = await window.api.setWallpaperAsBackground(img.path)
      setBackgroundImage(dataUrl || img.dataUrl)
      setWallpaperMode(false)
    } catch (err) {
      console.error('Error fijando fondo:', err)
      setBackgroundImage(img.dataUrl)
      setWallpaperMode(false)
    } finally {
      window.setTimeout(() => (document.activeElement as HTMLElement)?.blur(), 0)
    }
  }, [wallpaperImages, wallpaperIndex])

  // ── Keyboard Navigation (con sonidos UI) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (contextMenu.visible && (e.key === 'ContextMenu' || e.key === 'Escape')) {
        e.preventDefault()
        setContextMenu((prev) => ({ ...prev, visible: false }))
        return
      }

      if (selectedFriend) {
        const friendIndex = sortedSteamFriends.findIndex((friend) => friend.steamid === selectedFriend.steamid)
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault()
          const next = Math.min(friendIndex + 1, sortedSteamFriends.length - 1)
          if (next !== friendIndex) {
            playMove()
            setSelectedFriend(sortedSteamFriends[next])
          }
          return
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault()
          const previous = Math.max(friendIndex - 1, 0)
          if (previous !== friendIndex) {
            playMove()
            setSelectedFriend(sortedSteamFriends[previous])
          }
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          playEnter()
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setSelectedFriend(null)
          return
        }
      }

      if (e.key === 'Start') {
        e.preventDefault()
        setSidebarOpen(true)
        return
      }

      if (e.key === 'GamepadTouchpad') {
        e.preventDefault()
        if (isHomeCardFocused) {
          setIsIdle((prev) => !prev)
        } else {
          enterHomeIdle()
        }
        return
      }

      if (libraryView) {
        if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setLibraryView(false)
        }
        if (e.key === 'BrowserBack' || e.key === 'BrowserForward') {
          e.preventDefault()
          const nextSource: LibrarySource = e.key === 'BrowserBack' ? 'local' : 'steam'
          if (nextSource !== librarySource) {
            playMove()
            setLibrarySource(nextSource)
            if (nextSource === 'steam' && steamLibrary.length > 0) {
              setSelectedSteamAppId(String(steamLibrary[0].appid))
            } else if (nextSource === 'local' && games.length > 0) {
              setSelectedGameId(games[0]?.id ?? null)
            }
          }
          return
        }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown') && currentLibraryItems.length > 0) {
          e.preventDefault()
          const currentIndex = librarySource === 'steam'
            ? Math.max(0, currentLibraryItems.findIndex((game) => String((game as SteamLibraryGame).appid) === selectedSteamAppId))
            : Math.max(0, currentLibraryItems.findIndex((game) => 'id' in game && game.id === selectedGameId))
          const columnCount = libraryGridRef.current
            ? getComputedStyle(libraryGridRef.current).gridTemplateColumns.split(' ').length
            : 1
          const step = e.key === 'ArrowUp' ? -columnCount : e.key === 'ArrowDown' ? columnCount : e.key === 'ArrowLeft' ? -1 : 1
          const nextIndex = Math.max(0, Math.min(currentLibraryItems.length - 1, currentIndex + step))
          if (nextIndex !== currentIndex) playMove()
          if (librarySource === 'steam') {
            const nextGame = currentLibraryItems[nextIndex] as SteamLibraryGame
            setSelectedSteamAppId(String(nextGame.appid))
          } else {
            const nextGame = currentLibraryItems[nextIndex] as Game
            if (nextGame?.id) setSelectedGameId(nextGame.id)
          }
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (librarySource === 'steam' && selectedSteamAppId) {
            const steamGame = steamLibrary.find((game) => String(game.appid) === selectedSteamAppId)
            if (steamGame) {
              playEnter()
              setLibraryView(false)
              setDetailGameId(`steam-${steamGame.appid}`)
            }
            return
          }
          if (librarySelectedGame) {
            playEnter()
            setLibraryView(false)
            setDetailGameId(librarySelectedGame.id)
          }
        }
        return
      }
      if (modal !== null) {
        if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setModal(null)
        }
        return
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ContextMenu') {
        e.preventDefault()

        if (libraryView && librarySource === 'steam' && selectedSteamAppId) {
          setContextMenu({ visible: true, x: window.innerWidth * 0.52, y: window.innerHeight * 0.42, gameId: `steam-${selectedSteamAppId}` })
          return
        }
        if (libraryView && librarySelectedGame) {
          setContextMenu({ visible: true, x: window.innerWidth * 0.52, y: window.innerHeight * 0.42, gameId: librarySelectedGame.id })
          return
        }
        if (isHomeFocused && homeCardMode === 'quick-apps' && quickAppSlots[quickAppFocusIndex]) {
          setContextMenu({ visible: true, x: window.innerWidth * 0.55, y: window.innerHeight * 0.45, gameId: `quick-${quickAppSlots[quickAppFocusIndex]!.id}` })
          return
        }
        if (selectedGameId && selectedGameId !== 'library') {
          setContextMenu({ visible: true, x: window.innerWidth * 0.55, y: window.innerHeight * 0.45, gameId: selectedGameId })
        }
        return
      }

      if (sidebarOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSidebarIndex((prev) => {
            const next = Math.min(prev + 1, 4)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSidebarIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'Enter') {
          e.preventDefault()
          playEnter()
          if (sidebarIndex === 0) openAddGameModal()
          else if (sidebarIndex === 1) { /* Store action */ }
          else if (sidebarIndex === 2) handleOpenSpecs()
          else if (sidebarIndex === 3) setModal('settings')
          else if (sidebarIndex === 4) window.close()
          setSidebarOpen(false)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setSidebarOpen(false)
        }
      } else if (isWallpaperMode) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setWallpaperIndex((prev) => {
            const next = Math.min(prev + 1, wallpaperImages.length - 1)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setWallpaperIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setWallpaperMode(false)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          playEnter()
          void handleChooseWallpaperAsHome()
        }
      } else if (isHomeFocused && homeCardMode === 'quick-apps') {
        const validQuickApps = quickAppSlots.filter((app): app is QuickApp => !!app)
        if (validQuickApps.length === 0) return

        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setQuickAppFocusIndex((prev) => {
            const next = Math.min(prev + 1, validQuickApps.length - 1)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setQuickAppFocusIndex((prev) => {
            const next = Math.max(prev - 1, 0)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setQuickAppFocusIndex((prev) => {
            const next = Math.min(prev + 2, validQuickApps.length - 1)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setQuickAppFocusIndex((prev) => {
            const next = Math.max(prev - 2, 0)
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setHomeCardMode('bottom')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const app = validQuickApps[quickAppFocusIndex]
          if (app) {
            playEnter()
            void handleLaunchQuickApp(app)
          }
        }
      } else if (isHomeFocused && homeCardMode === 'bottom') {
        const bottomCardCount = 5
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          setBottomCardIndex((prev) => {
            const next = (prev + 1) % bottomCardCount
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setBottomCardIndex((prev) => {
            const next = (prev - 1 + bottomCardCount) % bottomCardCount
            if (next !== prev) playMove()
            return next
          })
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setHomeCardMode('main')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (bottomCardIndex === 0) {
            playEnter()
            openLibraryView()
          } else if (bottomCardIndex === 1) {
            const store = stores[currentStoreIndex]
            if (store) {
              playEnter()
              void handleOpenStore(store.id)
            }
          } else if (bottomCardIndex === 2) {
            playEnter()
            setModal('settings')
          } else if (bottomCardIndex === 3) {
            playEnter()
            setHomeCardMode('quick-apps')
            setQuickAppFocusIndex(0)
          } else if (bottomCardIndex === 4) {
            const firstFriend = sortedSteamFriends[0]
            if (firstFriend) {
              playEnter()
              setSelectedFriend(firstFriend)
            }
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          playClose()
          setHomeCardMode('main')
        }
      } else {
        const gameIds = ['library', ...visibleGames.map(g => g.id)]
        const currentIndex = gameIds.indexOf(selectedGameId || 'library')

        if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (currentIndex < gameIds.length - 1) {
            playMove()
            wipeDirectionRef.current = 1
            setSelectedGameId(gameIds[currentIndex + 1])
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (currentIndex > 0) {
            playMove()
            wipeDirectionRef.current = -1
            setSelectedGameId(gameIds[currentIndex - 1])
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          setHomeCardMode('bottom')
          setBottomCardIndex(0)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (selectedGameId === 'library' || !selectedGameId) {
            playEnter()
            openLibraryView()
          } else if (selectedGameId) {
            playEnter()
            setDetailGameId(selectedGameId)
          }
        } else if (e.key === 'Escape' && detailGameId) {
          e.preventDefault()
          playClose()
          setDetailGameId(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [libraryView, games, librarySelectedGame, selectedGameId, sidebarOpen, sidebarIndex, modal, visibleGames, handleLaunchGame, openLibraryView, openAddGameModal, handleOpenSpecs, isWallpaperMode, wallpaperImages.length, handleChooseWallpaperAsHome, detailGameId, librarySource, currentLibraryItems, selectedSteamAppId, steamLibrary, contextMenu.visible, selectedFriend, sortedSteamFriends, isHomeFocused, isHomeCardFocused, enterHomeIdle, quickAppFocusIndex, quickAppSlots, homeCardMode, bottomCardIndex, stores, currentStoreIndex, handleOpenStore, handleLaunchQuickApp])

  // ── Detail view handlers (con sonidos) ──
  const handleCloseDetail = useCallback(() => {
    playClose()
    setDetailGameId(null)
  }, [])

  const openDetailView = useCallback((gameId: string) => {
    playEnter()
    if (gameId.startsWith('steam-')) {
      const appid = gameId.replace(/^steam-/, '')
      setSelectedSteamAppId(appid)
      setSelectedGameId(null)
      setDetailGameId(gameId)
      return
    }

    setSelectedGameId(gameId)
    setDetailGameId(gameId)
  }, [])

  useEffect(() => {
    if (!gamesRowRef.current) return

    const targetId = selectedGameId === 'library' ? 'btn-library' : selectedGameId ? `game-card-${selectedGameId}` : null
    if (!targetId) return

    const target = document.getElementById(targetId)
    if (!target) return

    const row = gamesRowRef.current
    const targetLeft = target.offsetLeft
    const targetWidth = target.offsetWidth
    const rowWidth = row.clientWidth
    const desiredLeft = targetLeft - (rowWidth - targetWidth) / 2

    row.scrollTo({
      left: Math.max(0, desiredLeft),
      behavior: 'smooth'
    })
  }, [selectedGameId, visibleGames])

  useEffect(() => {
    if (!libraryView) return
    previousLibraryIndexRef.current = null
    libraryGridRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [libraryView, librarySource])

  useEffect(() => {
    if (!libraryView || !libraryGridRef.current) return
    const grid = libraryGridRef.current
    const selectedId = librarySource === 'steam' ? selectedSteamAppId : selectedGameId
    if (!selectedId) return

    const items = librarySource === 'steam' ? steamLibrary : games
    const currentIndex = librarySource === 'steam'
      ? steamLibrary.findIndex((game) => game.appid === selectedId)
      : games.findIndex((game) => game.id === selectedId)
    if (currentIndex < 0) return

    const target = document.getElementById(`library-game-${selectedId}`)
    if (!target) return

    const previousIndex = previousLibraryIndexRef.current
    previousLibraryIndexRef.current = currentIndex
    const columnCount = getComputedStyle(grid).gridTemplateColumns.split(' ').length
    if (previousIndex === null || Math.floor(previousIndex / columnCount) === Math.floor(currentIndex / columnCount)) return

    const previousItem = items[previousIndex]
    const previousId = librarySource === 'steam'
      ? (previousItem as SteamLibraryGame)?.appid
      : (previousItem as Game)?.id
    const previousTarget = previousId
      ? document.getElementById(`library-game-${previousId}`)
      : null
    const rowDistance = previousTarget ? target.offsetTop - previousTarget.offsetTop : target.offsetHeight
    const nextScrollTop = Math.max(0, grid.scrollTop + rowDistance)
    grid.scrollTo({ top: nextScrollTop, behavior: 'smooth' })
  }, [games, librarySource, libraryView, selectedGameId, selectedSteamAppId, steamLibrary])

  const handlePrevShot = useCallback(() => {
    setDetailShotIndex((prev) =>
      detailScreenshots.length ? (prev - 1 + detailScreenshots.length) % detailScreenshots.length : 0
    )
  }, [detailScreenshots.length])

  const handleNextShot = useCallback(() => {
    setDetailShotIndex((prev) =>
      detailScreenshots.length ? (prev + 1) % detailScreenshots.length : 0
    )
  }, [detailScreenshots.length])

  // ── Detail view background style (accent color derived from hero image) ──
  const detailBgStyle: React.CSSProperties = detailGame?.heroImageUrl
    ? {
      backgroundImage: `linear-gradient(transparent 5%, rgb(12, 12, 12) 57%, rgb(12, 12, 12) 100%), url(${detailGame.heroImageUrl})`,
      backgroundSize: 'contain',
      backgroundPosition: 'top',
      backgroundRepeat: 'no-repeat',
      backgroundColor: detailAccent
    }
    : { background: 'var(--gbl-bg-primary)' }

  // ── Background style (con crossfade sin destello negro) ──
  const wallpaperBg = isWallpaperMode && selectedWallpaper ? selectedWallpaper.dataUrl : null
  const bgStyle = wallpaperBg
    ? {
      backgroundImage: `linear-gradient(to bottom, rgba(12,12,12,0.35) 0%, rgba(12,12,12,0.55) 45%, rgba(12,12,12,0.92) 100%), url(${wallpaperBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
    : selectedGame?.heroImageUrl
      ? {
        backgroundImage: `linear-gradient(to bottom, transparent 20%, var(--gbl-bg-primary) 56%), url(${selectedGame.heroImageUrl})`,
        backgroundSize: 'contain',
        backgroundPosition: 'top',
        backgroundRepeat: 'no-repeat'
      }
      : backgroundImage
        ? {
          backgroundImage: `linear-gradient(to bottom, rgba(12,12,12,0.55) 0%, rgba(12,12,12,0.4) 40%, rgba(12,12,12,0.7) 70%, rgba(12,12,12,0.92) 100%), url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }
        : selectedGame
          ? {
            background: `radial-gradient(ellipse at 50% 60%, ${selectedGame.color}15 0%, transparent 60%), var(--gbl-bg-primary)`
          }
          : {
            backgroundImage: `linear-gradient(to bottom, rgba(12,12,12,0.4) 0%, rgba(12,12,12,0.6) 45%, rgba(12,12,12,0.92) 100%), url(${defaultHomeBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }

  // Crossfade launcher-bg con wipe circular direccional (estilo PS5)
  const [bgCurrStyle, setBgCurrStyle] = useState<React.CSSProperties>(bgStyle)
  const [bgPrevStyle, setBgPrevStyle] = useState<React.CSSProperties | null>(null)
  const bgKeyRef = useRef<string>('')
  const wipeRafRef = useRef<number>(0)
  const bgKey = wallpaperBg ? `wall:${wallpaperBg.slice(0, 80)}` : selectedGame?.heroImageUrl ? `hero:${selectedGame.heroImageUrl}` : backgroundImage ? `custom:${backgroundImage.slice(0, 80)}` : selectedGame ? `color:${selectedGame.color}` : 'default'
  useEffect(() => {
    if (bgKeyRef.current === bgKey) {
      setBgCurrStyle(bgStyle)
      return undefined
    }
    const prev = bgCurrStyle
    const next = bgStyle
    const dir = wipeDirectionRef.current
    const heroUrl = wallpaperBg ?? selectedGame?.heroImageUrl
    const buildMask = (originX: string, p: number): string =>
      `radial-gradient(circle at ${originX} 50%, black ${p}%, transparent ${p + 100}%)`
    const doSwap = (): void => {
      const duration = 600
      const ease = (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const startTime = performance.now()
      const originX = dir === 1 ? '0%' : '100%'
      // Prev layer ON TOP: mask shrinks to reveal new layer underneath
      setBgPrevStyle({ ...prev, zIndex: 2 })
      // New layer UNDERNEATH: hidden by prev, revealed as prev mask shrinks
      setBgCurrStyle({ ...next, zIndex: 1 })
      bgKeyRef.current = bgKey
      const animate = (now: number): void => {
        const elapsed = now - startTime
        const raw = Math.min(elapsed / duration, 1)
        const fade = ease(raw)
        // Prev layer progress: 1→0 (visible→hidden mask)
        const prevP = Math.round((1 - fade) * 250 - 100)
        const prevMask = buildMask(originX, prevP)
        setBgPrevStyle(s => s ? {
          ...s,
          WebkitMaskImage: prevMask,
          maskImage: prevMask,
        } : s)
        if (raw < 1) {
          wipeRafRef.current = requestAnimationFrame(animate)
        } else {
          setBgPrevStyle(null)
        }
      }
      cancelAnimationFrame(wipeRafRef.current)
      wipeRafRef.current = requestAnimationFrame(animate)
    }
    if (heroUrl) {
      const img = new Image()
      let done = false
      const finish = (): void => { if (!done) { done = true; doSwap() } }
      img.onload = finish
      img.onerror = finish
      img.src = heroUrl
      if (img.complete) finish()
      const fallback = window.setTimeout(finish, 800)
      return (): void => { done = true; window.clearTimeout(fallback); cancelAnimationFrame(wipeRafRef.current) }
    } else {
      doSwap()
      return undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgKey])

  // Biblioteca: hero con crossfade también
  const libraryHeroUrl = librarySource === 'steam' ? steamBanner : (librarySelectedGame?.heroImageUrl ?? null)
  const [libPrevUrl, setLibPrevUrl] = useState<string | null>(null)
  const [libCurrUrl, setLibCurrUrl] = useState<string | null>(libraryHeroUrl)
  const libKeyRef = useRef<string | null>(libraryHeroUrl)
  useEffect(() => {
    if (libKeyRef.current === libraryHeroUrl) return undefined
    const prev = libCurrUrl
    const next = libraryHeroUrl
    const doSwapLib = (): void => {
      setLibPrevUrl(prev)
      setLibCurrUrl(next)
      libKeyRef.current = next
      window.setTimeout(() => setLibPrevUrl(null), 300)
    }
    if (next) {
      const img = new Image()
      let done = false
      const finish = (): void => { if (!done) { done = true; doSwapLib() } }
      img.onload = finish
      img.onerror = finish
      img.src = next
      if (img.complete) finish()
      const fb = window.setTimeout(finish, 800)
      return (): void => { done = true; window.clearTimeout(fb) }
    } else {
      doSwapLib()
      return undefined
    }
  }, [libraryHeroUrl, libCurrUrl])

  const steamDetailIsInstalled = Boolean(
    detailGame?.isSteam && detailGame.steamAppId && steamLibrary.some((game) => String(game.appid) === detailGame.steamAppId && game.installed)
  )

  return (
    <div className={`launcher ${showIdleMode ? 'idle' : ''} ${isWallpaperMode ? 'wallpaper-mode' : ''}`}>
      {/* ── Sidebar ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-title">GBL Launcher</div>
        <button className={`sidebar-item ${sidebarIndex === 0 ? 'focused' : ''}`} onClick={() => { openAddGameModal(); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><PlusIcon size={18} /></div> Agregar juego
        </button>
        <button className={`sidebar-item ${sidebarIndex === 1 ? 'focused' : ''}`} onClick={() => { setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><StoreIcon size={18} /></div> Tienda
        </button>
        <button className={`sidebar-item ${sidebarIndex === 2 ? 'focused' : ''}`} onClick={() => { handleOpenSpecs(); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><SystemIcon size={18} /></div> Especificaciones
        </button>
        <button className={`sidebar-item ${sidebarIndex === 3 ? 'focused' : ''}`} onClick={() => { setModal('settings'); setSidebarOpen(false); }}>
          <div className="sidebar-item-icon"><SettingsIcon size={18} /></div> Ajustes
        </button>
        <div style={{ marginTop: 'auto' }}>
          <button className={`sidebar-item ${sidebarIndex === 4 ? 'focused' : ''}`} onClick={() => window.close()}>
            <div className="sidebar-item-icon"><PowerIcon size={18} /></div> Salir
          </button>
        </div>
      </div>

      {/* Fondo con wipe direccional: prev se desvanece mientras la nueva hero se revela con radial-gradient */}
      <div className="launcher-bg-wrapper">
        {bgPrevStyle && (
          <div key="bg-prev" className="launcher-bg" style={bgPrevStyle} aria-hidden />
        )}
        <div key="bg-curr" className="launcher-bg" style={bgCurrStyle} />
      </div>


      {/* ── Header ── */}
      <header className="header-bar">
        <div className="header-left">
          <div className="user-avatar" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ cursor: 'pointer', overflow: 'hidden' }}>
            {profileAvatar ? (
              <img src={profileAvatar} alt="Foto de perfil" className="user-avatar-img" draggable={false} />
            ) : (
              (profileName.trim() ? profileName.trim().charAt(0).toUpperCase() : 'G')
            )}
          </div>
          <div className="header-greeting">
            <span className="header-greeting-name">
              {profileName.trim() ? profileName.trim() : 'GBL Launcher'}
            </span>
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
            {selectedGame.logoImageUrl ? (
              <img src={selectedGame.logoImageUrl} alt={selectedGame.name} className="hero-logo" draggable={false} />
            ) : (
              <h1 className="hero-title">{selectedGame.name}</h1>
            )}
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

      {/* ── Music Player — arriba del row de juegos, máx 400W, usa API del PC ── */}
      {(isHomeCardFocused || showIdleMode) && (
        <MusicPlayer isVisible={isHomeCardFocused && !showIdleMode} isIdle={showIdleMode} isGameRunning={isGameRunning} />
      )}

      {/* ── Wallpaper row (solo Home, tras elegir carpeta con W) — Enter/doble click fija fondo Home ── */}
      {isWallpaperMode && (
        <div className="wallpaper-row-container">
          <div className="wallpaper-row" ref={wallpaperRowRef}>
            {wallpaperImages.map((img, idx) => (
              <div
                key={img.path}
                id={`wallpaper-card-${idx}`}
                className={`wallpaper-card ${idx === wallpaperIndex ? 'selected' : ''}`}
                onClick={() => setWallpaperIndex(idx)}
                onDoubleClick={() => handleChooseWallpaperAsHome(idx)}
                title={`${img.name} — Enter o doble click para fijar como fondo de Home`}
              >
                <img src={img.dataUrl} alt={img.name} className="wallpaper-card-img" draggable={false} />
              </div>
            ))}
          </div>
          <div className="wallpaper-row-hint">↑ ↓ para navegar · Enter o doble click para elegir fondo de Home · Esc para salir</div>
        </div>
      )}

      {/* ── Game cards row ── */}
      <div className="games-row-container">
        <div className="games-row" ref={gamesRowRef}>
          {/* Library card */}
          <div
            className={`game-card library-card ${homeCardMode === 'main' && (selectedGameId === 'library' || (!selectedGameId && games.length === 0)) ? 'selected' : ''}`}
            onClick={() => {
              if (selectedGameId === 'library') openLibraryView()
              else setSelectedGameId('library');
            }}
            onDoubleClick={openLibraryView}
            id="btn-library"
            title="Biblioteca"
          >
            <div className="library-card-content">
              <div className="library-card-icon-wrapper">
                <svg width="64px" height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#ffffff" ><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.1875L21.4501 10.275L21.0001 11.625H20.25V20.25H3.75005V11.625H3.00005L2.55005 10.275L12 3.1875ZM5.25005 10.125V18.75H18.75V10.125L12 5.0625L5.25005 10.125Z" fill="#ffffff" ></path> </g></svg>
              </div>
            </div>
          </div>

          {visibleGames.map((game) => (
            <div
              key={game.id}
              className={`game-card ${homeCardMode === 'main' && selectedGameId === game.id ? 'selected' : ''}`}
              onClick={() => openDetailView(game.id)}
              onDoubleClick={() => handleLaunchGame(game.id)}
              onContextMenu={(e) => handleContextMenu(e, game.id)}
              title={game.name}
              id={`game-card-${game.id}`}
            >
              {runningGameId === game.id && <div className="running-badge" />}
              {game.gridImageUrl ? (
                <img
                  src={game.gridImageUrl}
                  alt={game.name}
                  className="game-card-cover"
                  draggable={false}
                />
              ) : game.iconDataUrl ? (
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
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="bottom-row">
        <div
          className={`dashboard-container bottom-card ${homeCardMode === 'bottom' && bottomCardIndex === 0 ? 'selected' : ''}`}
          onClick={() => {
            setHomeCardMode('bottom')
            setBottomCardIndex(0)
            openLibraryView()
          }}
          style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}
        >
          <div className="dashboard">
            {/* Tarjeta 1: Mis juegos y aplicaciones */}
            <div className="tile apps-tile" style={{ '--layer': 4 } as React.CSSProperties}>
              <div className="library-icon">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>

            {/* Tarjeta 2: Descenders */}
            <div className="tile game-tile" style={{ backgroundImage: "url('https://cdn2.steamgriddb.com/thumb/7dbdfd71d964683a8bcbe6f5f5b85eb9.jpg')", '--layer': 3 } as React.CSSProperties}>
              <div className="game-overlay"></div>
            </div>

            {/* Tarjeta 3: Astroneer */}
            <div className="tile game-tile" style={{ backgroundImage: "url('https://cdn2.steamgriddb.com/thumb/48b505846f30602aaff7e2d336720e6d.jpg')", '--layer': 2 } as React.CSSProperties}>
              <div className="game-overlay"></div>
            </div>

            {/* Tarjeta 4: Sea of Thieves */}
            <div className="tile game-tile" style={{ backgroundImage: "url('https://cdn2.steamgriddb.com/thumb/055c25fa28c4eb8c6bb0672e557eef80.jpg')", '--layer': 1 } as React.CSSProperties}>
              <div className="game-overlay"></div>
            </div>
          </div>

          {/* Texto superpuesto al frente de todo */}
          <div className="floating-title">My games & apps</div>
        </div>
        <div
          className={`bottom-card store-card ${homeCardMode === 'bottom' && bottomCardIndex === 1 ? 'selected' : ''}`}
          id="btn-store"
          onMouseEnter={() => setStoreHover(true)}
          onMouseLeave={() => setStoreHover(false)}
        >
          <div className="store-carousel">
            {stores.map((store, index) => {
              const active = index === currentStoreIndex
              const capsuleImg = storeCapsuleImage(store.id)
              const logoImg = storeLogoImage(store.id)
              return (
                <div
                  key={store.id}
                  className={`store-capsule ${active ? 'active' : ''} ${store.installed ? '' : 'not-installed'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (active) {
                      handleOpenStore(store.id)
                    } else {
                      handleStoreSelect(index)
                    }
                  }}
                  title={store.installed ? `Abrir ${store.name}` : `${store.name} no está instalado`}
                >
                  {capsuleImg && (
                    <img
                      src={capsuleImg}
                      alt={store.name}
                      className="store-capsule-bg"
                      draggable={false}
                    />
                  )}
                  <div className="store-capsule-overlay" />
                  {logoImg ? (
                    <img src={logoImg} alt={store.name} className="store-capsule-logo" draggable={false} />
                  ) : (
                    <div className="store-capsule-icon">
                      <StoreIcon size={20} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="store-dots">
            {stores.map((store, index) => (
              <button
                key={store.id}
                className={`store-dot ${index === currentStoreIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleStoreSelect(index)
                }}
                aria-label={store.name}
              />
            ))}
          </div>
        </div>

        <div className="box-cards">


          <div className={`bottom-card-square ${homeCardMode === 'bottom' && bottomCardIndex === 2 ? 'selected' : ''}`} onClick={() => { setHomeCardMode('bottom'); setBottomCardIndex(2); setModal('settings') }} id="btn-settings">
            <SettingsIcon size={70} className="bottom-card-icon" />
          </div>

          <div className={`bottom-card-square carp ${homeCardMode === 'bottom' && bottomCardIndex === 3 ? 'selected' : ''}`}>
            {Array.from({ length: 4 }).map((_, index) => {
              const app = quickApps[index]

              if (!app) {
                const isQuickAppFocused = homeCardMode === 'quick-apps' && quickAppFocusIndex === index
                return (
                  <button
                    key={`quick-app-add-${index}`}
                    type="button"
                    className={`quick-app-card quick-app-add-card ${isQuickAppFocused ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setHomeCardMode('quick-apps')
                      setQuickAppFocusIndex(index)
                      void handleAddQuickApp()
                    }}
                    aria-label="Agregar app rápida"
                    title="Agregar app rápida"
                  >
                    <PlusIcon size={28} />
                  </button>
                )
              }

              const isQuickAppFocused = homeCardMode === 'quick-apps' && quickAppFocusIndex === index

              return (
                <div
                  key={app.id}
                  className={`quick-app-card ${isQuickAppFocused ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setHomeCardMode('quick-apps')
                    setQuickAppFocusIndex(index)
                    void handleLaunchQuickApp(app)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleContextMenu(e, `quick-${app.id}`)
                  }}
                  title={`${app.name} — clic derecho para más opciones`}
                >
                  {app.artworkUrl ? (
                    <img src={app.artworkUrl} alt={app.name} draggable={false} />
                  ) : (
                    <div className="quick-app-fallback">{app.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className={`bottom-card friends-exit-card ${homeCardMode === 'bottom' && bottomCardIndex === 4 ? 'selected' : ''} ${windowSize.width === 1380 && windowSize.height === 830 ? 'minimal' : ''}`} id="btn-exit">
          <div className="friends-card-left">
            <div className="friends-ring-wrap">
              <svg width="110" height="110" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="10" />
                {isControllerConnected && (
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="rgba(255,255,255,0.92)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - 0.79)}`}
                    transform="rotate(-90 60 60)"
                    style={{ opacity: 0.95 }}
                  />
                )}
              </svg>
              <div className="friends-ring-center">
                <img src={controllerImg} alt="controller" className="friends-ring-img" draggable={false} />
                <span className="friends-ring-pct">79%</span>
              </div>
            </div>
          </div>
          <div className="friends-card-divider" />
          <div className="friends-card-right">
            {/* <div className="friends-header">
              <SteamIcon size={14} className="friends-steam-icon" />
              <span>friends</span>
            </div> */}
            <div className="friends-avatars">
              {friendsAvatarSlots.map((friend, index) => (
                <div
                  key={friend ? friend.steamid : `friend-slot-${index}`}
                  className={`friend-avatar ${friend ? '' : 'empty'} ${friend && isFriendActive(friend) ? 'active' : ''}`}
                  style={{ zIndex: 5 - index }}
                  title={friend ? friend.personaname : 'Vacío'}
                  onClick={friend ? () => { playEnter(); setSelectedFriend(friend) } : undefined}
                  onKeyDown={friend ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      playEnter()
                      setSelectedFriend(friend)
                    }
                  } : undefined}
                  role={friend ? 'button' : undefined}
                  tabIndex={friend ? 0 : undefined}
                >
                  {friend ? (
                    <>
                      <img
                        src={friend.avatarfull || friend.avatar || ''}
                        alt={friend.personaname}
                        className="friend-avatar-image"
                        draggable={false}
                      />
                      {isFriendActive(friend) && <span className="friend-avatar-status" aria-label="Activo" />}
                    </>
                  ) : (
                    <span className="friend-avatar-empty" />
                  )}
                </div>
              ))}
            </div>
            <div className="friends-actions-grid">
              {windowSize.width < 1600 ? (
                <>
                  <div className="friends-row compact">
                    <button
                      className="friends-btn fecha-btn"
                      onClick={(e) => e.stopPropagation()}
                      title={friendsMusicTitle}
                    >
                      {friendsMusicTitle}
                    </button>
                  </div>
                  <div className="friends-row compact">
                    <button
                      className="friends-btn w-btn"
                      onClick={(e) => { e.stopPropagation(); handleWallpaperButton() }}
                      title={isHomeFocused ? 'Elegir carpeta de wallpapers (una vez) / Mostrar wallpapers' : 'Editar artwork del juego'}
                      id="btn-wallpaper"
                    >
                      <ImageIcon size={16} />
                    </button>
                    <button className="friends-btn salir-btn" onClick={() => window.close()} title="Salir">
                      Salir
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="friends-row">
                    <button
                      className="friends-btn fecha-btn"
                      onClick={(e) => e.stopPropagation()}
                      title={friendsMusicTitle}
                    >
                      {friendsMusicTitle}
                    </button>
                    <button
                      className="friends-btn w-btn"
                      onClick={(e) => { e.stopPropagation(); handleWallpaperButton() }}
                      title={isHomeFocused ? 'Elegir carpeta de wallpapers (una vez) / Mostrar wallpapers' : 'Editar artwork del juego'}
                      id="btn-wallpaper"
                    >
                      <ImageIcon size={16} />
                    </button>
                  </div>
                  <div className="friends-row">
                    <button className="friends-btn es-btn" onClick={(e) => e.stopPropagation()} title="ES (sin función)">
                      ES
                    </button>
                    <button className="friends-btn salir-btn" onClick={() => window.close()} title="Salir">
                      Salir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedFriend && (
        <div className="friend-panel-layer" role="presentation">
          <button
            className="friend-panel-backdrop"
            aria-label="Cerrar panel de amigo"
            onClick={() => setSelectedFriend(null)}
          />
          <aside className="friend-panel" aria-label={`Perfil de ${selectedFriend.personaname}`}>
            <button className="friend-panel-close" onClick={() => setSelectedFriend(null)} title="Cerrar">
              <CloseIcon size={18} />
            </button>
            <div className="friend-panel-cover">
              <img
                src={selectedFriendBackground || selectedFriend.avatarfull || selectedFriend.avatar || ''}
                alt={selectedFriend.personaname}
                className="friend-panel-cover-image"
                draggable={false}
              />
            </div>
            <div className="friend-panel-identity">
              <div className="friend-panel-avatar-wrap">
                <img
                  src={selectedFriend.avatarfull || selectedFriend.avatar || ''}
                  alt=""
                  className="friend-panel-avatar"
                  draggable={false}
                />
                <span className={`friend-panel-status ${isFriendActive(selectedFriend) ? 'active' : ''}`} />
              </div>
              <div className="friend-panel-identity-text">
                <h2>{selectedFriend.personaname}</h2>
                <p className={`friend-panel-presence ${isFriendActive(selectedFriend) ? 'active' : ''}`}>
                  {isFriendActive(selectedFriend) ? 'Conectado' : 'Desconectado'}
                </p>
              </div>
            </div>
            <p className={`friend-panel-activity ${selectedFriend.gameextrainfo ? 'playing' : ''}`}>
              {selectedFriend.gameextrainfo
                ? `Jugando a ${selectedFriend.gameextrainfo}`
                : isFriendActive(selectedFriend)
                  ? 'Está conectado, pero no está jugando'
                  : 'No está conectado'}
            </p>
            <button
              className="friend-panel-action"
              onClick={async () => {
                playEnter()
                const profileUrl = selectedFriend.profileurl || `https://steamcommunity.com/profiles/${selectedFriend.steamid}`
                const result = await window.api.openExternal(`steam://url/SteamIDPage/${selectedFriend.steamid}`)
                if (!result.success) {
                  const steamUrlResult = await window.api.openExternal(`steam://openurl/${profileUrl}`)
                  if (!steamUrlResult.success) await window.api.openExternal(profileUrl)
                }
              }}
            >
              Ver perfil en Steam
            </button>
            {otherFriends.length > 0 && (
              <div className="friend-panel-list">
                <h3>Otros amigos</h3>
                {otherFriends.map((friend) => (
                  <button
                    key={friend.steamid}
                    className="friend-panel-friend-card"
                    onClick={() => {
                      playEnter()
                      setSelectedFriend(friend)
                    }}
                  >
                    <img
                      src={friend.avatarfull || friend.avatar || ''}
                      alt=""
                      className="friend-panel-friend-avatar"
                      draggable={false}
                    />
                    <span className="friend-panel-friend-info">
                      <strong>{friend.personaname}</strong>
                      <small className={isFriendActive(friend) ? 'active' : ''}>
                        {friend.gameextrainfo || (isFriendActive(friend) ? 'Activo' : 'Desconectado')}
                      </small>
                    </span>
                    <span className={`friend-panel-friend-dot ${isFriendActive(friend) ? 'active' : ''}`} />
                  </button>
                ))}
              </div>
            )}
            {selectedFriend.gameid && (
              <button
                className="friend-panel-action primary"
                onClick={async () => {
                  playEnter()
                  await window.api.openExternal(`steam://rungameid/${selectedFriend.gameid}`)
                }}
              >
                Unirse al juego
              </button>
            )}
          </aside>
        </div>
      )}

      {/* ── Context Menu ── */}
      {contextMenu.visible && contextMenu.gameId && (() => {
        const isSteam = contextMenu.gameId!.startsWith('steam-')
        const isQuickApp = contextMenu.gameId!.startsWith('quick-') && !games.some((g) => g.id === contextMenu.gameId)
        const steamAppId = isSteam ? contextMenu.gameId!.replace(/^steam-/, '') : null
        const steamGame = isSteam ? steamLibrary.find((g) => String(g.appid) === String(steamAppId)) : null
        const steamInstalled = steamGame ? Boolean(steamGame.installed) : false
        const quickAppId = contextMenu.gameId!.startsWith('quick-') ? contextMenu.gameId!.replace(/^quick-/, '') : null
        const quickAppTarget = quickAppId ? quickApps.find((a) => a.id === quickAppId) : null
        return (
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="context-menu-item"
              onClick={() => {
                const id = contextMenu.gameId!
                setContextMenu((p) => ({ ...p, visible: false }))
                if (quickAppTarget) {
                  void handleLaunchQuickApp(quickAppTarget)
                  return
                }
                // Actualiza selección visual según tipo
                if (isSteam && steamAppId) setSelectedSteamAppId(String(steamAppId))
                else setSelectedGameId(id)
                handleLaunchGame(id)
              }}
            >
              <PlayIcon size={16} />{' '}
              {isSteam && !steamInstalled
                ? 'Descargar'
                : quickAppTarget?.kind === 'program'
                  ? 'Abrir'
                  : 'Jugar'}
            </button>
            {!isSteam && !isQuickApp && !quickAppTarget && (
              <button
                className="context-menu-item"
                onClick={() => {
                  if (contextMenu.gameId) openEditGameModal(contextMenu.gameId)
                  setContextMenu((p) => ({ ...p, visible: false }))
                }}
              >
                <EditIcon size={16} /> Editar
              </button>
            )}
            {quickAppTarget && (
              <button
                className="context-menu-item"
                onClick={() => {
                  if (quickAppId) void handleEditQuickApp(quickAppId)
                  setContextMenu((p) => ({ ...p, visible: false }))
                }}
              >
                <EditIcon size={16} /> Cambiar archivo
              </button>
            )}
            <button
              className="context-menu-item"
              onClick={() => {
                if (contextMenu.gameId) openSteamGridModal(contextMenu.gameId)
                setContextMenu((p) => ({ ...p, visible: false }))
              }}
            >
              <ImageIcon size={16} /> Buscar Artwork
            </button>
            {!isSteam && (
              <>
                <div className="context-menu-separator" />
                <button
                  className="context-menu-item danger"
                  onClick={() => {
                    if (quickAppId && quickAppTarget) {
                      saveQuickApps(quickApps.filter((a) => a.id !== quickAppId))
                    } else if (contextMenu.gameId) {
                      handleDeleteGame(contextMenu.gameId)
                    }
                    setContextMenu((p) => ({ ...p, visible: false }))
                  }}
                >
                  <TrashIcon size={16} /> Eliminar
                </button>
              </>
            )}
          </div>
        )
      })()}

      {/* ── Detail View ── */}
      {detailGame && (
        <div className="detail-view">
          <div
            key={detailGame.heroImageUrl || detailGame.id}
            className="detail-bg fade-in-bg"
            style={detailBgStyle}
          />
          <button className="detail-close" onClick={handleCloseDetail} title="Cerrar">
            <CloseIcon size={20} />
          </button>

          <div className="detail-hero-section">
            <div className="detail-hero-content">
              {detailGame.logoImageUrl ? (
                <img
                  src={detailGame.logoImageUrl}
                  alt={detailGame.name}
                  className="hero-logo"
                  draggable={false}
                />
              ) : (
                <h1 className="hero-title">{detailGame.name}</h1>
              )}
            </div>

            <div className="detail-actions-row">

              <span className="detail-playtime">
                {formatPlaytime(detailGame.playtimeMinutes)} jugado
                {detailGame.lastPlayed && (
                  <>
                    {' '}
                    · Última vez:{' '}
                    {new Date(detailGame.lastPlayed).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="detail-info-row">
            {/* Screenshot carousel */}
            <div className="detail-carousel">
              {detailLoadingShots && (
                <div className="detail-carousel-status">Cargando capturas...</div>
              )}
              {!detailLoadingShots && detailScreenshots.length === 0 && (
                <div className="detail-carousel-status">
                  No se encontraron capturas para este juego
                </div>
              )}
              {!detailLoadingShots && detailScreenshots.length > 0 && (
                <>
                  <img
                    key={detailShotIndex}
                    src={detailScreenshots[detailShotIndex].path_full}
                    alt={`Captura ${detailShotIndex + 1} de ${detailGame.name}`}
                    className="detail-carousel-image"
                    draggable={false}
                  />
                  {detailScreenshots.length > 1 && (
                    <>
                      <button
                        className="detail-carousel-nav prev"
                        onClick={handlePrevShot}
                        aria-label="Captura anterior"
                      >
                        <ChevronLeftIcon size={20} />
                      </button>
                      <button
                        className="detail-carousel-nav next"
                        onClick={handleNextShot}
                        aria-label="Siguiente captura"
                      >
                        <ChevronRightIcon size={20} />
                      </button>
                      <div className="detail-carousel-dots">
                        {detailScreenshots.map((_, i) => (
                          <button
                            key={i}
                            className={`detail-carousel-dot ${i === detailShotIndex ? 'active' : ''}`}
                            onClick={() => setDetailShotIndex(i)}
                            aria-label={`Captura ${i + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Description, then a real-style Metacritic + rating card below it */}
            <div className="detail-side-panel">
              <div className="detail-description">
                <h3 className="detail-section-title">Acerca del juego</h3>
                {detailInfoLoading && (
                  <p className="detail-description-text muted">Cargando descripción...</p>
                )}
                {!detailInfoLoading && detailInfo?.description && (
                  <p className="detail-description-text">{detailInfo.description}</p>
                )}
                {!detailInfoLoading && !detailInfo?.description && (
                  <p className="detail-description-text muted">No hay descripción disponible.</p>
                )}
              </div>

              {!smallDetailLayout && <div className="detail-meta-section2" style={{ maxWidth: '400px' }}>
                {detailInfo?.metacritic && (
                  <a
                    className="metacritic-widget"
                    href={detailInfo.metacritic.url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!detailInfo.metacritic?.url) e.preventDefault()
                    }}
                  >
                    {/* <span
                      className={`metacritic-widget-score ${detailInfo.metacritic.score >= 75
                        ? 'good'
                        : detailInfo.metacritic.score >= 50
                          ? 'mixed'
                          : 'bad'
                        }`}
                    >
                      {detailInfo.metacritic.score}
                    </span> */}
                    {/* <div className="metacritic-widget-body">
                      <div className="metacritic-widget-brand">
                        <img src="https://store.fastly.steamstatic.com/public/images/v6/mc_logo_no_text.png" alt="" />
                        <span className="metacritic-widget-name">metacritic</span>
                      </div>
                      <span className="metacritic-widget-link">Leer las reseñas ↗</span>
                    </div> */}
                  </a>
                )}

                {detailInfo?.rating && (detailInfo.rating.rating || detailInfo.rating.descriptors.length > 0) && (
                  <div className="rating-widget">
                    {/* <div className="rating-widget-badge">
                      <span className="rating-widget-badge-top">
                        {formatRatingBadge(detailInfo.rating.rating, detailInfo.rating.board).top}
                      </span>
                      <span className="rating-widget-badge-letter">
                        {formatRatingBadge(detailInfo.rating.rating, detailInfo.rating.board).letter}
                      </span>
                      <span className="rating-widget-badge-board">{detailInfo.rating.board}</span>
                    </div> */}
                    <img src={Teen} alt="" style={{ width: '80px' }} />
                    <div className="rating-widget-body">
                      {detailInfo.rating.descriptors.length > 0 && (
                        <ul className="rating-widget-descriptors">
                          {detailInfo.rating.descriptors.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      )}
                      <span className="rating-widget-caption">
                        Clasificación por edades para: {detailInfo.rating.board}
                      </span>
                    </div>
                  </div>
                )}
              </div>}
            </div>

            {/* Reviews, then release info, then tags */}
            <div className={`detail-ratings-panel ${smallDetailLayout ? 'esrb-only' : ''}`}>
              {smallDetailLayout ? (
                detailInfo?.rating && (detailInfo.rating.rating || detailInfo.rating.descriptors.length > 0) && (
                  <div className="rating-widget">
                    <img src={Teen} alt="" style={{ width: '80px' }} />
                    <div className="rating-widget-body">
                      {detailInfo.rating.descriptors.length > 0 && (
                        <ul className="rating-widget-descriptors">
                          {detailInfo.rating.descriptors.map((d) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      )}
                      <span className="rating-widget-caption">
                        Clasificación por edades para: {detailInfo.rating.board}
                      </span>
                    </div>
                  </div>
                )
              ) : compactDetailReviewLayout ? (
                <>
                  {(detailInfo?.reviewsPositive || detailInfo?.reviewsNegative) && (
                    <div className="detail-meta-section">
                      {detailInfo?.reviewsPositive && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">Reseñas positivas</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsPositive.summary} ({detailInfo.reviewsPositive.count})
                          </span>
                        </div>
                      )}
                      {detailInfo?.reviewsNegative && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">Reseñas negativas</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsNegative.summary} ({detailInfo.reviewsNegative.count})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {detailInfo?.developer && (
                    <div className="detail-meta-section">
                      <div className="detail-meta-row">
                        <span className="detail-meta-label">Desarrollador</span>
                        <span className="detail-meta-value link">{detailInfo.developer}</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(detailInfo?.reviewsRecent || detailInfo?.reviewsAll) && (
                    <div className="detail-meta-section">
                      {detailInfo?.reviewsRecent && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">Reseñas recientes</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsRecent.summary} ({detailInfo.reviewsRecent.count})
                          </span>
                        </div>
                      )}
                      {detailInfo?.reviewsAll && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">Todas las reseñas</span>
                          <span className="detail-meta-value link">
                            {detailInfo.reviewsAll.summary} ({detailInfo.reviewsAll.count})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {(detailInfo?.developer || detailInfo?.publisher || detailInfo?.releaseDate) && (
                    <div className="detail-meta-section">
                      {detailInfo?.releaseDate && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">Fecha de lanzamiento</span>
                          <span className="detail-meta-value">{detailInfo.releaseDate}</span>
                        </div>
                      )}
                      {detailInfo?.developer && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">Desarrollador</span>
                          <span className="detail-meta-value link">{detailInfo.developer}</span>
                        </div>
                      )}
                      {detailInfo?.publisher && (
                        <div className="detail-meta-row">
                          <span className="detail-meta-label">Editor</span>
                          <span className="detail-meta-value link">{detailInfo.publisher}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {detailInfo?.tags && detailInfo.tags.length > 0 && (
                    <div className="detail-meta-section">
                      <div className="detail-meta-tags">
                        {detailInfo.tags.map((tag) => (
                          <span key={tag} className="detail-tag-pill">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* BOTON DE JUGAR!!!!! */}
            <div className="detail-play-actions">
              <button
                className={`btn-play btn-play-detail ${runningGameId === detailGame.id ? 'running' : ''}`}
                onClick={() => handleLaunchGame(detailGame.id)}
              >
                <PlayIcon size={20} />
                {runningGameId === detailGame.id ? 'Ejecutando...' : detailGame.isSteam && !steamDetailIsInstalled ? 'Descargar' : 'Jugar'}
              </button>
              <button
                className="detail-edit-button"
                onClick={() => {
                  openSteamGridModal(detailGame.id)
                }}
                aria-label="Editar Artwork"
                title="Editar Artwork"
              >
                <MoreIcon size={20} />
              </button>
            </div>

          </div>
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

      {/* ── Quick App: elegir tipo (Juego / Programa) ── */}
      {pendingQuickApp && (
        <div className="modal-overlay" onClick={() => setPendingQuickApp(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">¿Qué es "{pendingQuickApp.name}"?</h2>
              <button className="modal-close" onClick={() => setPendingQuickApp(null)}>
                <CloseIcon size={20} />
              </button>
            </div>
            {(pendingQuickApp.autoArtworkUrl || pendingQuickApp.iconDataUrl) && (
              <div className="icon-preview">
                <img src={pendingQuickApp.autoArtworkUrl || pendingQuickApp.iconDataUrl || ''} alt={pendingQuickApp.name} />
                <span className="icon-preview-text">Artwork detectado automáticamente</span>
              </div>
            )}
            <p className="settings-profile-hint" style={{ margin: '14px 0' }}>
              Los <strong>juegos</strong> aparecen en recientes/biblioteca y al seleccionarlos abren la pantalla de
              detalles. Los <strong>programas</strong> se abren directo con un clic, sin pantalla de detalles.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPendingQuickApp(null)}>
                Cancelar
              </button>
              <button className="btn-secondary" onClick={() => finalizeQuickApp('program')}>
                Es un Programa
              </button>
              <button className="btn-primary" onClick={() => finalizeQuickApp('game')}>
                Es un Juego
              </button>
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
              <h2 className="modal-title">{detailGame?.isSteam ? 'Detalles de Steam' : 'Editar Juego'}</h2>
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
                readOnly={detailGame?.isSteam}
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
                  readOnly={detailGame?.isSteam}
                />
                {!detailGame?.isSteam && (
                  <button className="btn-browse" onClick={handleBrowse}>
                    <FolderIcon size={16} />
                  </button>
                )}
              </div>
            </div>
            {formIconUrl && (
              <div className="icon-preview">
                <img src={formIconUrl} alt="Icono del juego" />
                <span className="icon-preview-text">Icono del juego</span>
              </div>
            )}
            <div className="modal-actions">
              {detailGame?.isSteam ? (
                <button className="btn-primary" onClick={() => setModal(null)}>
                  Cerrar
                </button>
              ) : (
                <>
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
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      if (editingGameId) openSteamGridModal(editingGameId)
                    }}
                  >
                    <ImageIcon size={14} /> Artwork
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Library View ── */}
      {libraryView && (
        <section className="library-view" aria-label="Biblioteca">
          {librarySource === 'steam' && !steamAccount.linked ? (
            <div className="library-empty library-view-empty">
              Vincula tu cuenta de Steam desde Ajustes para ver tu biblioteca.
            </div>
          ) : (
            <>
              <div className="library-hero">
                {libPrevUrl && (
                  <div
                    key={`lib-prev-${libPrevUrl}`}
                    className="library-hero-bg prev"
                    style={{ backgroundImage: `linear-gradient(to top, rgba(12, 12, 12, 0.98) 0%, rgba(12, 12, 12, 0.7) 42%, rgba(12, 12, 12, 0.08) 100%), url(${libPrevUrl})` }}
                    aria-hidden
                  />
                )}
                <div
                  key={`lib-curr-${libCurrUrl ?? 'empty'}`}
                  className="library-hero-bg current"
                  style={libCurrUrl ? { backgroundImage: `linear-gradient(to top, rgba(12, 12, 12, 0.98) 0%, rgba(12, 12, 12, 0.7) 42%, rgba(12, 12, 12, 0.08) 100%), url(${libCurrUrl})` } : undefined}
                />
                <div className="library-hero-content">
                  <button className="library-back-button" onClick={() => setLibraryView(false)}>
                    <ChevronLeftIcon size={20} /> Volver
                  </button>
                  <div className="library-title-row">
                    <button
                      type="button"
                      className={`library-view-platform ${librarySource === 'local' ? 'active' : 'muted'}`}
                      onClick={() => setLibrarySource('local')}

                    >
                      Biblioteca
                    </button>
                    <span className="library-view-divider">|</span>
                    <button
                      type="button"
                      className={`library-view-platform ${librarySource === 'steam' ? 'active' : 'muted'}`}
                      onClick={() => {
                        if (steamAccount.linked) setLibrarySource('steam')
                        else setModal('settings')
                      }}
                    >
                      Steam
                    </button>
                  </div>
                  <p className="library-view-subtitle">
                    {librarySource === 'steam' && steamLibraryLoading
                      ? 'Cargando juegos...'
                      : `${currentLibraryCount} ${currentLibraryCount === 1 ? 'juego' : 'juegos'}`}
                  </p>
                  {librarySource === 'local' && (
                    <button className="btn-primary library-add-button" onClick={openAddGameModal}>
                      <PlusIcon size={16} /> Agregar juego
                    </button>
                  )}
                </div>
              </div>
              <div key={librarySource} className="library-source-panel">
                <div className="library-grid library-view-grid" ref={libraryGridRef}>
                  {librarySource === 'steam' ? (
                    steamLibraryLoading ? (
                      Array.from({ length: 15 }).map((_, i) => (
                        <div key={`steam-skeleton-${i}`} className="library-item-skeleton" />
                      ))
                    ) : steamLibrary.length === 0 ? (
                      <div className="library-empty library-view-empty">
                        No se encontraron juegos en tu biblioteca de Steam.
                      </div>
                    ) : (
                      steamLibrary.map((game) => (
                      <article
                        key={game.appid}
                        id={`library-game-${game.appid}`}
                        className={`library-item steam-library-item ${selectedSteamAppId === game.appid ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedSteamAppId(game.appid)
                          setDetailGameId(`steam-${game.appid}`)
                        }}
                        onDoubleClick={() => handleLaunchGame(`steam-${game.appid}`)}
                        onContextMenu={(e) => handleContextMenu(e, `steam-${game.appid}`)}
                      >
                        <div className="library-item-art steam-library-art">
                          <img
                            src={game.gridImageUrl || steamLibraryArtUrl(game.appid)}
                            alt={game.name}
                            className={`library-item-cover ${game.installed ? 'installed' : 'not-installed'}`}
                            draggable={false}
                          />
                          {!game.installed && (
                            <img
                              src={installIcon}
                              alt="Descargar"
                              className="library-item-download-badge"
                              title="Descargar"
                              draggable={false}
                            />
                          )}
                        </div>
                        <div className="library-item-info">
                          <span className="library-item-name">{game.name}</span>
                          <span className="library-item-playtime">
                            {formatPlaytime(Math.round(game.playtime_forever / 60))} jugado
                          </span>
                        </div>
                        <div className="library-item-actions">
                          <button
                            className="library-action-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setContextMenu({ visible: true, x: rect.left, y: rect.bottom + 6, gameId: `steam-${game.appid}` })
                            }}
                            title="Más opciones"
                          >
                            <MoreIcon size={14} />
                          </button>
                        </div>
                                            </article>
                      ))
                    )
                  ) : (
                    sortedLibraryGames.map((game) => (
                      <article
                        key={game.id}
                        id={`library-game-${game.id}`}
                        className={`library-item ${librarySelectedGame?.id === game.id ? 'selected' : ''}`}
                        onClick={() => setSelectedGameId(game.id)}
                        onDoubleClick={() => { setLibraryView(false); openDetailView(game.id) }}
                      >
                        <div className="library-item-art">
                          {game.gridImageUrl ? (
                            <img src={game.gridImageUrl} alt={game.name} className="library-item-cover" draggable={false} />
                          ) : game.iconDataUrl ? (
                            <img src={game.iconDataUrl} alt={game.name} className="library-item-icon" draggable={false} />
                          ) : (
                            <div className="game-card-placeholder" style={{ background: `linear-gradient(135deg, ${game.color}30, ${game.color}15)` }}>
                              {game.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="library-item-info">
                          {game.logoImageUrl ? (
                            <img src={game.logoImageUrl} alt={game.name} className="library-item-logo" draggable={false} />
                          ) : (
                            <span className="library-item-name">{game.name}</span>
                          )}
                          <span className="library-item-playtime">{formatPlaytime(game.playtimeMinutes)} jugado</span>
                        </div>
                        <div className="library-item-actions">
                          <button className="library-action-btn" onClick={(e) => { e.stopPropagation(); openEditGameModal(game.id) }} title="Editar">
                            <EditIcon size={14} />
                          </button>
                          <button className="library-action-btn" onClick={(e) => { e.stopPropagation(); openSteamGridModal(game.id) }} title="Buscar Artwork">
                            <ImageIcon size={14} />
                          </button>
                          <button className="library-action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id) }} title="Eliminar">
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </section>
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

            <div className="settings-section">
              <h3 className="settings-section-title">Steam</h3>
              <div className="settings-bg-actions" style={{ justifyContent: 'flex-start' }}>
                <button className="btn-primary" onClick={handleSteamOpenIdLink}>
                  {steamAccount.linked ? 'Volver a vincular con Steam' : 'Vincular con Steam'}
                </button>
                {steamAccount.linked && (
                  <button className="btn-danger" onClick={handleSteamUnlink}>
                    Desvincular
                  </button>
                )}
              </div>
              {steamAccount.linked && (
                <p className="settings-profile-hint" style={{ marginTop: 12 }}>
                  Cuenta conectada: {steamAccount.accountName || steamAccount.steamId}
                </p>
              )}
            </div>

            {/* Profile settings */}
            <div className="settings-section">
              <h3 className="settings-section-title">Perfil</h3>
              <div className="settings-profile-row">
                <div
                  className="settings-profile-avatar"
                  onClick={handleSelectProfileImage}
                  title="Cambiar foto de perfil"
                >
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Foto de perfil" className="user-avatar-img" draggable={false} />
                  ) : (
                    <span className="user-avatar-initial">
                      {profileName.trim() ? profileName.trim().charAt(0).toUpperCase() : 'G'}
                    </span>
                  )}
                  <div className="settings-profile-avatar-overlay">
                    <ImageIcon size={18} />
                  </div>
                </div>
                <div className="settings-profile-fields">
                  <input
                    className="form-input"
                    placeholder="Nombre de usuario"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    onBlur={(e) => handleSaveProfileName(e.target.value.trim())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        ; (e.target as HTMLInputElement).blur()
                      }
                    }}
                  />
                  <p className="settings-profile-hint">
                    El nombre se guarda al salir del campo o pulsar Enter. Haz clic en la foto para cambiarla.
                  </p>
                </div>
              </div>
            </div>

            {/* Background settings */}
            <div className="settings-section">
              <h3 className="settings-section-title">Fondo de pantalla</h3>
              <div className="settings-bg-preview">
                {backgroundImage ? (
                  <img src={backgroundImage} alt="Fondo actual" className="settings-bg-thumb" />
                ) : (
                  <div className="settings-bg-placeholder">
                    <ImageIcon size={24} />
                    <span>Sin fondo personalizado</span>
                  </div>
                )}
              </div>
              <div className="settings-bg-actions">
                <button className="btn-secondary" onClick={handleSelectBackground}>
                  <ImageIcon size={14} /> Cambiar fondo
                </button>
                {backgroundImage && (
                  <button className="btn-danger" onClick={handleClearBackground}>
                    Restaurar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SteamGridDB Modal ── */}
      {modal === 'steamgrid' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal sgdb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Buscar Artwork en SteamGridDB</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Search bar */}
            <div className="sgdb-search-row">
              <div className="form-file-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Buscar juego..."
                  value={sgdbSearch}
                  onChange={(e) => setSgdbSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSgdbSearch()
                  }}
                  autoFocus
                />
                <button className="btn-browse" onClick={handleSgdbSearch} disabled={sgdbLoading}>
                  <SearchIcon size={16} />
                </button>
              </div>
            </div>

            {/* Search results */}
            {sgdbLoading && <div className="sgdb-loading">Buscando...</div>}

            {!sgdbSelectedGame && sgdbResults.length > 0 && (
              <div className="sgdb-results">
                {sgdbResults.map((game) => (
                  <button
                    key={game.id}
                    className="sgdb-result-item"
                    onClick={() => handleSgdbSelectGame(game)}
                  >
                    <span className="sgdb-result-name">{game.name}</span>
                    {game.verified && <span className="sgdb-verified">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Art type tabs + images */}
            {sgdbSelectedGame && (
              <>
                <div className="sgdb-game-header">
                  <span className="sgdb-game-name">{sgdbSelectedGame.name}</span>
                  <button
                    className="btn-secondary sgdb-back-btn"
                    onClick={() => {
                      setSgdbSelectedGame(null)
                      setSgdbImages([])
                    }}
                  >
                    ← Volver
                  </button>
                </div>

                <div className="sgdb-tabs">
                  {(['square_grids', 'grids', 'heroes', 'logos', 'icons'] as SteamGridArtType[]).map((type) => (
                    <button
                      key={type}
                      className={`sgdb-tab ${sgdbArtType === type ? 'active' : ''}`}
                      onClick={() => handleSgdbChangeArtType(type)}
                    >
                      {type === 'grids' ? 'Portadas' :
                        type === 'square_grids' ? 'Grids 1:1' :
                          type === 'heroes' ? 'Banners' :
                            type === 'logos' ? 'Logos' : 'Iconos'}
                    </button>
                  ))}
                </div>

                {sgdbImagesLoading && <div className="sgdb-loading">Cargando imágenes...</div>}

                <div className="sgdb-images-grid">
                  {sgdbImages.map((img) => (
                    <div
                      key={img.id}
                      className="sgdb-image-card"
                      onClick={() => handleSgdbApplyImage(img)}
                      title="Clic para aplicar"
                    >
                      <img
                        src={img.thumb || img.url}
                        alt="Artwork"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                  ))}
                  {!sgdbImagesLoading && sgdbImages.length === 0 && (
                    <div className="sgdb-no-images">No se encontraron imágenes</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App