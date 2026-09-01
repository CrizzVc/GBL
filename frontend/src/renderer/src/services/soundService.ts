/**
 * Sound Service - Reproduce sonidos UI del launcher
 *  - move: navegación con flechas
 *  - enter: confirmación con Enter / click
 *  - enterGame: lanzar juego
 *  - closeUI: Escape / cerrar vista
 */

import moveUrl from '../assets/sounds/move.mp3'
import enterUrl from '../assets/sounds/enter.mp3'
import enterGameUrl from '../assets/sounds/enter_game.mp3'
import closeUrl from '../assets/sounds/close_UI.mp3'

// Fallback: si vite no resuelve los alias con espacio, usar URL directa
// const moveFallback = new URL('../assets/sounds/move.mp3', import.meta.url).href

type SoundName = 'move' | 'enter' | 'enterGame' | 'close'

const soundUrls: Record<SoundName, string> = {
  move: moveUrl,
  enter: enterUrl,
  enterGame: enterGameUrl,
  close: closeUrl
}

const audioCache = new Map<SoundName, HTMLAudioElement>()
let unlocked = false

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  const cached = audioCache.get(name)
  if (cached) return cached
  const url = soundUrls[name]
  if (!url) return null
  try {
    const audio = new Audio(url)
    audio.preload = 'auto'
    audio.volume = name === 'move' ? 0.45 : name === 'enterGame' ? 0.65 : 0.55
    audioCache.set(name, audio)
    // preload
    audio.load()
    return audio
  } catch {
    return null
  }
}

// Desbloquea AudioContext / HTMLAudio tras gesto del usuario (requerido por algunos navegadores)
function unlockIfNeeded(): void {
  if (unlocked) return
  unlocked = true
  // precargar todos
  ;(Object.keys(soundUrls) as SoundName[]).forEach((k) => getAudio(k))
}

if (typeof window !== 'undefined') {
  const unlockEvents: (keyof WindowEventMap)[] = ['click', 'keydown', 'touchstart']
  const onFirstGesture = (): void => {
    unlockIfNeeded()
    unlockEvents.forEach((e) => window.removeEventListener(e, onFirstGesture))
  }
  unlockEvents.forEach((e) => window.addEventListener(e, onFirstGesture, { once: true, passive: true } as AddEventListenerOptions))
}

function play(name: SoundName): void {
  try {
    unlockIfNeeded()
    const audio = getAudio(name)
    if (!audio) return
    // Para sonidos rápidos como move, clonar permite solapamiento si se presiona rápido
    if (name === 'move') {
      const clone = audio.cloneNode() as HTMLAudioElement
      clone.volume = audio.volume
      clone.play().catch(() => {})
      return
    }
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch {}
}

export function playMove(): void {
  play('move')
}

export function playEnter(): void {
  play('enter')
}

export function playEnterGame(): void {
  play('enterGame')
}

export function playClose(): void {
  play('close')
}

export function preloadSounds(): void {
  unlockIfNeeded()
}
