import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as fs from 'fs'
import { spawn } from 'child_process'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
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
      const fileExists = hasExecutable ? fs.existsSync(exePath) : false

      if (win) {
        win.minimize()
      }

      const startTime = Date.now()

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
