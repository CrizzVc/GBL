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
  FolderIcon,
  BooksIcon
} from './components/Icons'

import steamLogo from './assets/tiendas/steamLogo.png'
import epicLogo from './assets/tiendas/EpicLogo.png'
import gogLogo from './assets/tiendas/gogLogo.png'
import steamBanner from './assets/tiendas/steamBanner.png'
import epicBanner from './assets/tiendas/EpicBanner.png'
import gogBanner from './assets/tiendas/gogBanner.png'
import Teen from './assets/ratings/T.png'
import installIcon from './assets/images/install.png'

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
}

type SteamGridArtType = 'grids' | 'square_grids' | 'heroes' | 'logos' | 'icons'
type LibrarySource = 'local' | 'steam'

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */
const GAME_COLORS = [
  '#6b7280', '#9ca3af', '#d1d5db', '#4b5563', '#374151',
  '#a3a3a3', '#737373', '#525252', '#e5e7eb', '#78716c'
]

const BACKEND_URL = 'http://localhost:3000'
const RECENT_GAMES_LIMIT = 15

const sortGamesByNewestFirst = (items: Game[]): Game[] =>
  [...items].sort((a, b) => {
    const aDate = new Date(a.createdAt || a.lastPlayed || 0).getTime()
    const bDate = new Date(b.createdAt || b.lastPlayed || 0).getTime()
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
  const [runningGameId, setRunningGameId] = useState<string | null>(null)
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
  const [steamLibrary, setSteamLibrary] = useState<SteamLibraryGame[]>([])
  const [steamLibraryLoading, setSteamLibraryLoading] = useState(false)

  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

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

  const visibleGames = useMemo(() => getRecentGames(games), [games])
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
      iconDataUrl: null,
      playtimeMinutes: Math.round(steamGame.playtime_forever / 60),
      lastPlayed: null,
      createdAt: new Date().toISOString(),
      color: '#66b2ff',
      steamAppId: String(steamGame.appid),
      isSteam: true,
      gridImageUrl: steamLibraryArtUrl(steamGame.appid),
      heroImageUrl: steamLibraryArtUrl(steamGame.appid)
    }
  }, [detailGameId, games, steamLibrary, steamLibraryArtUrl])
  const currentLibraryItems = librarySource === 'steam' ? steamLibrary : games
  const currentLibraryCount = librarySource === 'steam' ? steamLibrary.length : games.length
  const compactDetailReviewLayout =
    Math.abs(windowSize.width - 1380) <= 1 && Math.abs(windowSize.height - 830) <= 1

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



  // ── Track current window size for compact detail layout ──
  useEffect(() => {
    const updateWindowSize = (): void => {
      setWindowSize({
        width: window.outerWidth,
        height: window.outerHeight
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
          setSelectedGameId(normalizedGames[0]?.id ?? null)
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
        installed: Boolean(game.installed)
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

  useEffect(() => {
    if (steamAccount.linked) {
      void loadSteamLibrary()
    } else {
      setSteamLibrary([])
      setSelectedSteamAppId(null)
    }
  }, [steamAccount, loadSteamLibrary])

  // ── Store carousel auto-advance (paused on hover) ──
  useEffect(() => {
    if (stores.length <= 1 || storeHover) return
    const interval = setInterval(() => {
      setCurrentStoreIndex((prev) => (prev + 1) % stores.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [stores.length, storeHover])

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
        // 1) Resolve the game name to a Steam AppID
        const resolveRes = await fetch(
          `${BACKEND_URL}/api/steam/resolve?term=${encodeURIComponent(detailGame.name)}`
        )
        if (!resolveRes.ok) return
        const resolved = await resolveRes.json()
        const appid = resolved?.appid
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

  // ── Close detail view with Escape ──
  useEffect(() => {
    if (!detailGameId) return
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setDetailGameId(null)
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

          const [gridsRes, heroesRes, logosRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/steamgrid/grids/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/heroes/${gameId}`),
            fetch(`${BACKEND_URL}/api/steamgrid/logos/${gameId}`)
          ])

          if (gridsRes.ok) {
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
  const handleLaunchGame = useCallback(async () => {
    const launchTarget = selectedGame ?? (selectedSteamGame ? {
      id: `steam-${selectedSteamGame.appid}`,
      name: selectedSteamGame.name,
      exePath: `steam://rungameid/${selectedSteamGame.appid}`,
      iconDataUrl: null,
      playtimeMinutes: Math.round(selectedSteamGame.playtime_forever / 60),
      lastPlayed: null,
      createdAt: new Date().toISOString(),
      color: '#66b2ff',
      steamAppId: String(selectedSteamGame.appid),
      isSteam: true,
      gridImageUrl: steamLibraryArtUrl(selectedSteamGame.appid),
      heroImageUrl: steamLibraryArtUrl(selectedSteamGame.appid)
    } as Game : null)

    if (!launchTarget) return

    setRunningGameId(launchTarget.id)
    try {
      await window.api.launchGame(launchTarget.id, launchTarget.exePath)
    } catch (err) {
      console.error('Error launching game:', err)
      setRunningGameId(null)
    }
  }, [selectedGame, selectedSteamGame, steamLibraryArtUrl])

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

  const openLibraryView = useCallback(() => {
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
  }, [sgdbTargetGameId, sgdbSelectedGame, sgdbArtType, games, saveGames])

  const openSteamGridModal = useCallback((gameId: string) => {
    const game = games.find((g) => g.id === gameId)
    if (!game) return
    setSgdbTargetGameId(gameId)
    setSgdbSearch(game.name)
    setSgdbArtType('grids')
    setSgdbResults([])
    setSgdbSelectedGame(null)
    setSgdbImages([])
    setModal('steamgrid')
  }, [games])

  // ── Keyboard Navigation ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (libraryView) {
        if (e.key === 'Escape') setLibraryView(false)
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
              setLibraryView(false)
              setDetailGameId(`steam-${steamGame.appid}`)
            }
            return
          }
          if (librarySelectedGame) {
            setLibraryView(false)
            setDetailGameId(librarySelectedGame.id)
          }
        }
        return
      }
      if (modal !== null) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (sidebarOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSidebarIndex(prev => Math.min(prev + 1, 4))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSidebarIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (sidebarIndex === 0) openAddGameModal()
          else if (sidebarIndex === 1) { /* Store action */ }
          else if (sidebarIndex === 2) handleOpenSpecs()
          else if (sidebarIndex === 3) setModal('settings')
          else if (sidebarIndex === 4) window.close()
          setSidebarOpen(false)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Escape') {
          setSidebarOpen(false)
        }
      } else {
        const gameIds = ['library', ...visibleGames.map(g => g.id)]
        const currentIndex = gameIds.indexOf(selectedGameId || 'library')

        if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (currentIndex < gameIds.length - 1) {
            setSelectedGameId(gameIds[currentIndex + 1])
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          if (currentIndex > 0) {
            setSelectedGameId(gameIds[currentIndex - 1])
          }
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (selectedGameId === 'library' || !selectedGameId) {
            openLibraryView()
          } else {
            handleLaunchGame()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [libraryView, games, librarySelectedGame, selectedGameId, sidebarOpen, sidebarIndex, modal, visibleGames, handleLaunchGame, openLibraryView, openAddGameModal, handleOpenSpecs])

  // ── Detail view handlers ──
  const handleCloseDetail = useCallback(() => {
    setDetailGameId(null)
  }, [])

  const openDetailView = useCallback((gameId: string) => {
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

  // ── Background style ──
  const bgStyle = selectedGame?.heroImageUrl
    ? {
      backgroundImage: `linear-gradient(to bottom, transparent 20%, var(--gbl-bg-primary) 56%), url(${selectedGame.heroImageUrl})`,
      backgroundSize: 'contain',
      backgroundPosition: 'top',
      backgroundRepeat: 'no-repeat'
    }
    : backgroundImage
      ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
      : selectedGame
        ? {
          background: `radial-gradient(ellipse at 50% 60%, ${selectedGame.color}15 0%, transparent 60%), var(--gbl-bg-primary)`
        }
        : {}

  const steamDetailIsInstalled = Boolean(
    detailGame?.isSteam && detailGame.steamAppId && steamLibrary.some((game) => String(game.appid) === detailGame.steamAppId && game.installed)
  )

  return (
    <div className="launcher">
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

      {/* Animated background */}
      <div
        key={selectedGame?.heroImageUrl || backgroundImage || 'default'}
        className={`launcher-bg fade-in-bg ${backgroundImage ? 'has-custom-bg' : ''}`}
        style={bgStyle}
      />

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

      {/* ── Game cards row ── */}
      <div className="games-row-container">
        <div className="games-row" ref={gamesRowRef}>
          {/* Library card */}
          <div
            className={`game-card library-card ${selectedGameId === 'library' || (!selectedGameId && games.length === 0) ? 'selected' : ''}`}
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
                <BooksIcon size={64} />
              </div>
              <span className="library-card-label">My games & apps</span>
            </div>
          </div>

          {visibleGames.map((game) => (
            <div
              key={game.id}
              className={`game-card ${selectedGameId === game.id ? 'selected' : ''}`}
              onClick={() => openDetailView(game.id)}
              onDoubleClick={handleLaunchGame}
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
          className="dashboard-container bottom-card"
          onClick={openLibraryView}
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
          className="bottom-card store-card"
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
          <button
            className="context-menu-item"
            onClick={() => {
              if (contextMenu.gameId) openSteamGridModal(contextMenu.gameId)
            }}
          >
            <ImageIcon size={16} /> Buscar Artwork
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

              <div className="detail-meta-section2" style={{ maxWidth: '400px' }}>
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
              </div>
            </div>

            {/* Reviews, then release info, then tags */}
            <div className="detail-ratings-panel">
              {compactDetailReviewLayout ? (
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
                onClick={handleLaunchGame}
              >
                <PlayIcon size={20} />
                {runningGameId === detailGame.id ? 'Ejecutando...' : detailGame.isSteam && !steamDetailIsInstalled ? 'Descargar' : 'Jugar'}
              </button>
              <button
                className="detail-edit-button"
                onClick={() => {
                  if (detailGame.isSteam) {
                    setDetailGameId(detailGame.id)
                  } else {
                    openEditGameModal(detailGame.id)
                  }
                }}
                aria-label={detailGame.isSteam ? 'Detalles del juego' : 'Editar juego'}
                title={detailGame.isSteam ? 'Detalles del juego' : 'Editar juego'}
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
          ) : librarySource === 'steam' && steamLibraryLoading ? (
            <div className="library-empty library-view-empty">
              Cargando juegos de Steam...
            </div>
          ) : librarySource === 'steam' && steamLibrary.length === 0 ? (
            <div className="library-empty library-view-empty">
              No se encontraron juegos en tu biblioteca de Steam.
            </div>
          ) : (
            <>
              <div
                className="library-hero"
                style={librarySource === 'steam'
                  ? { backgroundImage: `linear-gradient(to top, rgba(12, 12, 12, 0.98) 0%, rgba(12, 12, 12, 0.7) 42%, rgba(12, 12, 12, 0.08) 100%), url(${steamBanner})` }
                  : librarySelectedGame?.heroImageUrl
                    ? { backgroundImage: `linear-gradient(to top, rgba(12, 12, 12, 0.98) 0%, rgba(12, 12, 12, 0.7) 42%, rgba(12, 12, 12, 0.08) 100%), url(${librarySelectedGame.heroImageUrl})` }
                    : undefined}
              >
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
                    {currentLibraryCount} {currentLibraryCount === 1 ? 'juego' : 'juegos'}
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
                  {librarySource === 'steam'
                    ? steamLibrary.map((game) => (
                      <article
                        key={game.appid}
                        id={`library-game-${game.appid}`}
                        className={`library-item steam-library-item ${selectedSteamAppId === game.appid ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedSteamAppId(game.appid)
                          setDetailGameId(`steam-${game.appid}`)
                        }}
                        onDoubleClick={() => {
                          setSelectedSteamAppId(game.appid)
                          void handleLaunchGame()
                        }}
                      >
                      <div className="library-item-art steam-library-art">
                        <img
                          src={steamLibraryArtUrl(game.appid)}
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
                      </article>
                    ))
                    : games.map((game) => (
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
                    ))}
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
                  {(['grids', 'square_grids', 'heroes', 'logos', 'icons'] as SteamGridArtType[]).map((type) => (
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