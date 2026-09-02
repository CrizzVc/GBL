import { useEffect, useState, useRef } from 'react'
import {
  fetchMediaSessions,
  pickNowPlayingSession,
  subscribeMediaSessions,
  SystemMediaSession
} from '../services/systemMediaService'

export function useSystemMedia(isGameRunning: boolean = false): { sessions: SystemMediaSession[]; nowPlaying: SystemMediaSession | null } {
  const [sessions, setSessions] = useState<SystemMediaSession[]>([])
  const [nowPlaying, setNowPlaying] = useState<SystemMediaSession | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const basePositionRef = useRef(0)
  const lastSyncRef = useRef<number>(Date.now())
  const isGameRunningRef = useRef(isGameRunning)

  useEffect(() => {
    isGameRunningRef.current = isGameRunning
  }, [isGameRunning])

  useEffect(() => {
    let mounted = true
    fetchMediaSessions().then((list) => {
      if (mounted) setSessions(list)
    })
    const unsubscribe = subscribeMediaSessions((list) => {
      if (mounted) setSessions(list)
    })
    const poll = setInterval(() => {
      if (isGameRunningRef.current) return
      fetchMediaSessions().then((list) => {
        if (mounted) setSessions(list)
      })
    }, 2500)
    return () => {
      mounted = false
      unsubscribe()
      clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    const picked = pickNowPlayingSession(sessions)
    setNowPlaying(picked)
    if (picked) {
      basePositionRef.current = picked.positionMs
      lastSyncRef.current = Date.now()
    }
  }, [sessions])

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (!nowPlaying || nowPlaying.playbackStatus !== 'playing') return
    basePositionRef.current = nowPlaying.positionMs
    lastSyncRef.current = Date.now()
    tickRef.current = setInterval(() => {
      if (isGameRunningRef.current) return
      const nextPos = basePositionRef.current + (Date.now() - lastSyncRef.current)
      setNowPlaying((prev) => {
        if (!prev || prev.playbackStatus !== 'playing') return prev
        if (prev.durationMs > 0 && nextPos >= prev.durationMs) {
          return { ...prev, positionMs: prev.durationMs }
        }
        return { ...prev, positionMs: nextPos }
      })
    }, 500)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [nowPlaying?.id, nowPlaying?.playbackStatus, nowPlaying?.positionMs])

  return { sessions, nowPlaying }
}
