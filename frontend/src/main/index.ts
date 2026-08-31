import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs'
import { spawn } from 'child_process'
import * as http from 'http'
import { URL } from 'url'

const STEAM_API_KEY = 'B1F361EA3C07B455DC8B0D06ED179B00'
const STEAM_OPENID_RETURN_URL = 'http://127.0.0.1:8765/steam-openid'
const STEAM_OPENID_REALM = 'http://127.0.0.1:8765'

interface SteamOpenIdResult {
  linked: boolean
  apiKey: string
  steamId: string
  accountName: string
  steamId64: string | null
}

let steamOpenIdServer: http.Server | null = null
let steamOpenIdResolve: ((value: SteamOpenIdResult) => void) | null = null
let steamOpenIdReject: ((reason?: unknown) => void) | null = null

function ensureSteamOpenIdServer(): void {
  if (steamOpenIdServer) return

  steamOpenIdServer = http.createServer((req: any, res: any) => {
    const requestUrl = new URL(req.url || '/', STEAM_OPENID_RETURN_URL)
    const mode = requestUrl.searchParams.get('openid.mode')
    const identity = requestUrl.searchParams.get('openid.identity') || requestUrl.searchParams.get('openid.claimed_id')

    if (requestUrl.pathname === '/steam-openid' && mode === 'id_res' && identity) {
      const steamIdMatch = identity.match(/\/id\/(\d+)/)
      const steamId = steamIdMatch ? steamIdMatch[1] : null

      if (steamId) {
        const payload = {
          linked: true,
          apiKey: STEAM_API_KEY,
          steamId,
          accountName: `Steam ${steamId}`,
          steamId64: steamId
        }

        const steamAccountPath = join(app.getPath('userData'), 'steam-account.json')
        fs.writeFileSync(steamAccountPath, JSON.stringify(payload, null, 2), 'utf8')

        if (steamOpenIdResolve) {
          steamOpenIdResolve(payload)
        }
        steamOpenIdResolve = null
        steamOpenIdReject = null

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<html><body><h2>Steam conectado.</h2><p>Puedes cerrar esta ventana.</p></body></html>')
        return
      }
    }

    if (steamOpenIdReject) {
      steamOpenIdReject(new Error('No se pudo completar la autenticación de Steam.'))
    }
    steamOpenIdResolve = null
    steamOpenIdReject = null

    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('La autenticación de Steam no pudo completarse.')
  })

  steamOpenIdServer.listen(8765, '127.0.0.1')
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1380,
    height: 830,
    minWidth: 1380,
    minHeight: 830,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('get-system-info', () => {
    const os = require('os')
    return {
      platform: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
      arch: process.arch,
      cpus: os.cpus()[0]?.model || 'Procesador Desconocido',
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
      uptime: Math.round(os.uptime() / 3600) + ' horas'
    }
  })

  const getGamesPath = (): string => {
    return join(app.getPath('userData'), 'games.json')
  }

  ipcMain.handle('get-games', async () => {
    const gamesPath = getGamesPath()
    if (fs.existsSync(gamesPath)) {
      try {
        const data = fs.readFileSync(gamesPath, 'utf8')
        return JSON.parse(data)
      } catch (e) {
        console.error('Error reading games.json', e)
        return []
      }
    }
    return []
  })

  ipcMain.handle('save-games', async (_event, games) => {
    try {
      const gamesPath = getGamesPath()
      fs.writeFileSync(gamesPath, JSON.stringify(games, null, 2), 'utf8')
      return { success: true }
    } catch (e: any) {
      console.error('Error writing games.json', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('select-game-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Ejecutables y Accesos Directos', extensions: ['exe', 'lnk', 'bat', 'cmd', 'sh', 'app'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  ipcMain.handle('get-file-icon', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return null
      const iconImage = await app.getFileIcon(filePath, { size: 'large' })
      return iconImage.toDataURL()
    } catch (err) {
      console.error('Error getting file icon:', err)
      return null
    }
  })

  ipcMain.handle('launch-game', async (event, gameId: string, exePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    try {
      const hasExecutable = exePath && exePath.trim() !== ''
      const isSteamProtocol = /^steam:\/\//i.test(exePath)
      const fileExists = isSteamProtocol ? false : hasExecutable ? fs.existsSync(exePath) : false

      if (win) {
        win.minimize()
      }

      const startTime = Date.now()

      if (isSteamProtocol) {
        await shell.openExternal(exePath)
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.restore()
            win.focus()
          }
        }, 1500)
        return { success: true, tracked: false, startTime, steamProtocol: true }
      }

      if (!hasExecutable || !fileExists) {
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.restore()
            win.focus()
            const simulatedMinutes = Math.floor(Math.random() * 4) + 2
            win.webContents.send('game-exited', { gameId, durationMinutes: simulatedMinutes })
          }
        }, 4000)
        return { success: true, tracked: false, startTime, simulated: true }
      }

      const ext = extname(exePath).toLowerCase()

      if (ext === '.lnk' || ext === '.url') {
        await shell.openPath(exePath)
        setTimeout(() => {
          if (win && !win.isDestroyed()) {
            win.restore()
            win.focus()
            const simulatedMinutes = Math.floor(Math.random() * 8) + 3
            win.webContents.send('game-exited', { gameId, durationMinutes: simulatedMinutes })
          }
        }, 6000)
        return { success: true, tracked: false, startTime }
      } else {
        const child = spawn(`"${exePath}"`, [], {
          detached: true,
          shell: true,
          cwd: dirname(exePath)
        })

        child.unref()

        let exited = false
        child.on('exit', () => {
          exited = true
          if (win && !win.isDestroyed()) {
            win.restore()
            win.focus()
            const durationMinutes = Math.round((Date.now() - startTime) / 60000)
            win.webContents.send('game-exited', { gameId, durationMinutes: Math.max(1, durationMinutes) })
          }
        })

        setTimeout(() => {
          if (!exited && win && !win.isDestroyed()) {
            win.restore()
            win.focus()
          }
        }, 8000)

        return { success: true, tracked: true, startTime }
      }
    } catch (error: any) {
      console.error('Error launching game:', error)
      if (win && !win.isDestroyed()) {
        win.restore()
        win.focus()
      }
      return { success: false, error: error.message }
    }
  })

  // ── Background image handlers ──
  const getBackgroundPath = (): string => {
    return join(app.getPath('userData'), 'background')
  }

  ipcMain.handle('select-background-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const srcPath = result.filePaths[0]
    const ext = extname(srcPath).toLowerCase()
    const destPath = getBackgroundPath() + ext

    // Remove any existing background files
    const bgBase = getBackgroundPath()
    for (const possibleExt of ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']) {
      const p = bgBase + possibleExt
      if (fs.existsSync(p)) {
        fs.unlinkSync(p)
      }
    }

    // Copy the new image to userData
    fs.copyFileSync(srcPath, destPath)

    // Read and return as data URL
    const data = fs.readFileSync(destPath)
    const mimeType = ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
        : ext === '.gif' ? 'image/gif'
          : ext === '.bmp' ? 'image/bmp'
            : 'image/jpeg'
    return `data:${mimeType};base64,${data.toString('base64')}`
  })

  ipcMain.handle('get-background-image', async () => {
    const bgBase = getBackgroundPath()
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']) {
      const p = bgBase + ext
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p)
        const mimeType = ext === '.png' ? 'image/png'
          : ext === '.webp' ? 'image/webp'
            : ext === '.gif' ? 'image/gif'
              : ext === '.bmp' ? 'image/bmp'
                : 'image/jpeg'
        return `data:${mimeType};base64,${data.toString('base64')}`
      }
    }
    return null
  })

  ipcMain.handle('clear-background-image', async () => {
    const bgBase = getBackgroundPath()
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']) {
      const p = bgBase + ext
      if (fs.existsSync(p)) {
        fs.unlinkSync(p)
      }
    }
    return { success: true }
  })

  // ── User profile handlers ──
  const getProfilePath = (): string => {
    return join(app.getPath('userData'), 'profile.json')
  }

  ipcMain.handle('get-profile', async () => {
    const profilePath = getProfilePath()
    if (fs.existsSync(profilePath)) {
      try {
        const data = fs.readFileSync(profilePath, 'utf8')
        return JSON.parse(data)
      } catch (e) {
        console.error('Error reading profile.json', e)
        return { name: '', avatar: null }
      }
    }
    return { name: '', avatar: null }
  })

  ipcMain.handle('save-profile', async (_event, profile: { name: string; avatar: string | null }) => {
    try {
      const profilePath = getProfilePath()
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf8')
      return { success: true }
    } catch (e: any) {
      console.error('Error writing profile.json', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('select-profile-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    try {
      const data = fs.readFileSync(result.filePaths[0])
      const ext = extname(result.filePaths[0]).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png'
        : ext === '.webp' ? 'image/webp'
          : ext === '.gif' ? 'image/gif'
            : ext === '.bmp' ? 'image/bmp'
              : 'image/jpeg'
      return `data:${mimeType};base64,${data.toString('base64')}`
    } catch (err) {
      console.error('Error reading profile image:', err)
      return null
    }
  })

  // ── Store detection & opening ──
  const STORES = [
    {
      id: 'steam',
      name: 'Steam',
      exeCandidates: [
        'C:\\Program Files (x86)\\Steam\\steam.exe',
        'C:\\Program Files\\Steam\\steam.exe',
        process.env.ProgramFiles + '\\Steam\\steam.exe',
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\Steam\\steam.exe'
      ]
    },
    {
      id: 'epic',
      name: 'Epic Games',
      exeCandidates: [
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe',
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
        process.env.ProgramFiles + '\\Epic Games\\Launcher\\Portal\\Binaries\\Win64\\EpicGamesLauncher.exe'
      ]
    },
    {
      id: 'gog',
      name: 'GOG Galaxy',
      exeCandidates: [
        (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)') + '\\GOG Galaxy\\GalaxyClient.exe',
        process.env.ProgramFiles + '\\GOG Galaxy\\GalaxyClient.exe',
        (process.env.LocalAppData || process.env.APPDATA || '') + '\\GOG.com\\Galaxy\\GalaxyClient.exe'
      ]
    }
  ]

  const findStoreExe = (store): string | null => {
    for (const candidate of store.exeCandidates) {
      try {
        if (candidate && fs.existsSync(candidate)) return candidate
      } catch {
        // ignore
      }
    }
    return null
  }

  ipcMain.handle('get-stores', async () => {
    return STORES.map((store) => {
      const exePath = findStoreExe(store)
      return {
        id: store.id,
        name: store.name,
        installed: !!exePath,
        exePath
      }
    })
  })

  ipcMain.handle('open-store', async (_event, storeId: string) => {
    const store = STORES.find((s) => s.id === storeId)
    if (!store) return { success: false, error: 'Tienda desconocida' }
    const exePath = findStoreExe(store)
    if (!exePath) return { success: false, error: 'Tienda no instalada' }
    try {
      const error = await shell.openPath(exePath)
      return error ? { success: false, error } : { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  const getSteamPaths = (): string[] => {
    const candidates = new Set<string>()

    const addPath = (value?: string): void => {
      if (!value) return
      const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '')
      if (normalized) candidates.add(normalized.replace(/\//g, '\\'))
    }

    for (const drive of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
      const root = `${drive}:\\`
      if (!fs.existsSync(root)) continue
      addPath(root)
      addPath(join(root, 'Steam'))
      addPath(join(root, 'steam'))
      addPath(join(root, 'Games', 'Steam'))
      addPath(join(root, 'Games', 'steam'))
    }

    const defaults = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      process.env.ProgramFiles ? `${process.env.ProgramFiles}\\Steam` : '',
      process.env['ProgramFiles(x86)'] ? `${process.env['ProgramFiles(x86)']}\\Steam` : '',
      process.env.LocalAppData ? `${process.env.LocalAppData}\\Steam` : ''
    ]
    defaults.forEach((value) => addPath(value))

    const steamRoots: string[] = []
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        steamRoots.push(candidate)
        continue
      }

      const possibleSteamFolders = [
        candidate,
        join(candidate, 'Steam'),
        join(candidate, 'steam'),
        join(candidate, 'Games', 'Steam'),
        join(candidate, 'Games', 'steam')
      ]

      for (const folder of possibleSteamFolders) {
        if (fs.existsSync(folder)) steamRoots.push(folder)
      }
    }

    const finalRoots: string[] = []
    for (const root of Array.from(new Set(steamRoots))) {
      if (!root || !fs.existsSync(root)) continue
      finalRoots.push(root)

      const libraryFoldersPath = join(root, 'steamapps', 'libraryfolders.vdf')
      if (!fs.existsSync(libraryFoldersPath)) continue

      try {
        const content = fs.readFileSync(libraryFoldersPath, 'utf8')
        const matches = [...content.matchAll(/\"([^\"]+)\"\s+\"([^\"]+)\"/g)]
        for (const [, , value] of matches) {
          if (!value || !value.includes(':')) continue
          const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '')
          const folder = normalized.replace(/\//g, '\\')
          if (folder && fs.existsSync(folder)) finalRoots.push(folder)
        }
      } catch {
        // ignore malformed libraryfolders.vdf
      }
    }

    return Array.from(new Set(finalRoots.filter((root) => !!root && fs.existsSync(root))))
  }

  ipcMain.handle('get-steam-installation-status', async (_event, appIds: string[]) => {
    const uniqueAppIds = Array.from(new Set((appIds || []).filter(Boolean).map((id) => String(id))))
    if (uniqueAppIds.length === 0) return {}

    const result: Record<string, boolean> = {}
    const steamRoots = getSteamPaths()

    for (const appId of uniqueAppIds) {
      result[appId] = steamRoots.some((root) => {
        const manifestCandidates = [
          join(root, 'steamapps', `appmanifest_${appId}.acf`),
          join(root, 'Steam', 'steamapps', `appmanifest_${appId}.acf`),
          join(root, 'steam', 'steamapps', `appmanifest_${appId}.acf`)
        ]
        return manifestCandidates.some((manifestPath) => fs.existsSync(manifestPath))
      })
    }

    return result
  })

  const getSteamAccountPath = (): string => {
    return join(app.getPath('userData'), 'steam-account.json')
  }

  ipcMain.handle('get-steam-account', async () => {
    const steamAccountPath = getSteamAccountPath()
    if (fs.existsSync(steamAccountPath)) {
      try {
        const data = fs.readFileSync(steamAccountPath, 'utf8')
        return JSON.parse(data)
      } catch (e) {
        console.error('Error reading steam-account.json', e)
        return {
          linked: false,
          apiKey: '',
          steamId: '',
          accountName: '',
          steamId64: null
        }
      }
    }
    return {
      linked: false,
      apiKey: '',
      steamId: '',
      accountName: '',
      steamId64: null
    }
  })

  ipcMain.handle('save-steam-account', async (_event, steamAccount: {
    linked: boolean
    apiKey: string
    steamId: string
    accountName: string
    steamId64: string | null
  }) => {
    try {
      const steamAccountPath = getSteamAccountPath()
      fs.writeFileSync(steamAccountPath, JSON.stringify(steamAccount, null, 2), 'utf8')
      return { success: true }
    } catch (e: any) {
      console.error('Error writing steam-account.json', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('open-steam-openid', async () => {
    ensureSteamOpenIdServer()

    return await new Promise<{
      linked: boolean
      apiKey: string
      steamId: string
      accountName: string
      steamId64: string | null
    }>((resolve, reject) => {
      steamOpenIdResolve = resolve as (value: {
        linked: boolean
        apiKey: string
        steamId: string
        accountName: string
        steamId64: string | null
      }) => void
      steamOpenIdReject = reject

      const openIdUrl = new URL('https://steamcommunity.com/openid/login')
      openIdUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0')
      openIdUrl.searchParams.set('openid.mode', 'checkid_setup')
      openIdUrl.searchParams.set('openid.return_to', STEAM_OPENID_RETURN_URL)
      openIdUrl.searchParams.set('openid.realm', STEAM_OPENID_REALM)
      openIdUrl.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select')
      openIdUrl.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select')

      void shell.openExternal(openIdUrl.toString())
    })
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
