import { useState, useEffect, useCallback } from 'react'
import steamLogo from '../assets/tiendas/steamLogo.png'

export interface NotificationData {
  id: string
  friendName: string
  gameName: string
  avatarUrl: string | null
  timestamp: number
}

interface NotificationProps {
  notification: NotificationData
  onDismiss: (id: string) => void
}

export default function Notification({ notification, onDismiss }: NotificationProps): React.JSX.Element {
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(notification.id)
    }, 300)
  }, [notification.id, onDismiss])

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [handleDismiss])

  return (
    <div className={`notification-card ${isExiting ? 'exiting' : ''}`}>
      <div className="notification-avatar">
        {notification.avatarUrl ? (
          <img
            src={notification.avatarUrl}
            alt={notification.friendName}
            className="notification-avatar-img"
            draggable={false}
          />
        ) : (
          <div className="notification-avatar-placeholder">
            {notification.friendName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="notification-content">
        <div className="notification-steam-header">
          <img src={steamLogo} alt="Steam" className="notification-steam-logo" draggable={false} />
        </div>
        <div className="notification-divider" />
        <div className="notification-title">
          {notification.friendName} está jugando a {notification.gameName}
        </div>
        <div className="notification-subtitle">presiona Tab para ampliar</div>
      </div>
    </div>
  )
}