import { useState, useCallback, useEffect, useRef } from 'react'

export interface NotificationItem {
  id: string
  friendName: string
  gameName: string
  avatarUrl: string | null
  timestamp: number
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

interface UseFriendNotificationsOptions {
  friends: SteamFriend[]
  enabled: boolean
}

export function useFriendNotifications({ friends, enabled }: UseFriendNotificationsOptions): {
  notifications: NotificationItem[]
  dismissNotification: (id: string) => void
  clearAllNotifications: () => void
} {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const previousFriendsRef = useRef<Map<string, SteamFriend>>(new Map())
  const isInitialLoadRef = useRef(true)

  useEffect(() => {
    if (!enabled || friends.length === 0) {
      return
    }

    if (isInitialLoadRef.current) {
      const initialMap = new Map<string, SteamFriend>()
      friends.forEach((friend) => {
        initialMap.set(friend.steamid, friend)
      })
      previousFriendsRef.current = initialMap
      isInitialLoadRef.current = false
      return
    }

    const previousFriends = previousFriendsRef.current

    friends.forEach((friend) => {
      const previousFriend = previousFriends.get(friend.steamid)

      if (previousFriend) {
        const wasPlaying = Boolean(previousFriend.gameextrainfo)
        const isNowPlaying = Boolean(friend.gameextrainfo)

        if (!wasPlaying && isNowPlaying && friend.gameextrainfo) {
          const newNotification: NotificationItem = {
            id: `notif-${friend.steamid}-${Date.now()}`,
            friendName: friend.personaname,
            gameName: friend.gameextrainfo,
            avatarUrl: friend.avatarfull || friend.avatar || null,
            timestamp: Date.now()
          }

          setNotifications((prev) => [...prev, newNotification])
        }
      }
    })

    const updatedMap = new Map<string, SteamFriend>()
    friends.forEach((friend) => {
      updatedMap.set(friend.steamid, friend)
    })
    previousFriendsRef.current = updatedMap
  }, [friends, enabled])

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    dismissNotification,
    clearAllNotifications
  }
}