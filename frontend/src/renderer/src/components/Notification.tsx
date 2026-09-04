import { useState, useEffect, useCallback } from 'react'

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

function CloseIcon({ size = 16 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
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
      <div className="notification-image">
        {notification.avatarUrl ? (
          <img
            src={notification.avatarUrl}
            alt={notification.friendName}
            className="notification-avatar"
            draggable={false}
          />
        ) : (
          <div className="notification-avatar-placeholder">
            {notification.friendName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="notification-content">
        <div className="notification-title">
          {notification.friendName} está jugando a {notification.gameName}
        </div>
      </div>
      <button className="notification-close" onClick={handleDismiss}>
        <CloseIcon size={14} />
      </button>
    </div>
  )
}