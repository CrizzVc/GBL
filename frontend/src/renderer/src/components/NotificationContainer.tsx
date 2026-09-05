import { useEffect, useRef } from 'react'
import Notification from './Notification'
import { playNotification } from '../services/soundService'

export interface NotificationItem {
  id: string
  friendName: string
  gameName: string
  avatarUrl: string | null
  timestamp: number
}

interface NotificationContainerProps {
  notifications: NotificationItem[]
  onDismiss: (id: string) => void
}

export default function NotificationContainer({ notifications, onDismiss }: NotificationContainerProps): React.JSX.Element {
  const prevCountRef = useRef(notifications.length)

  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      playNotification()
    }
    prevCountRef.current = notifications.length
  }, [notifications.length])

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}