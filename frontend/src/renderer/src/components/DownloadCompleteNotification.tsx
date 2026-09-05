import { useState, useEffect, useCallback } from 'react'
import steamLogo from '../assets/tiendas/steamLogo.png'
import { playNotification } from '../services/soundService'

interface DownloadCompleteNotificationProps {
  id: string
  name: string
  iconUrl: string | null
  onDismiss: (id: string) => void
}

export default function DownloadCompleteNotification({ id, name, iconUrl, onDismiss }: DownloadCompleteNotificationProps): React.JSX.Element {
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(id)
    }, 300)
  }, [id, onDismiss])

  useEffect(() => {
    playNotification()
    const timer = setTimeout(() => {
      handleDismiss()
    }, 5000)

    return () => clearTimeout(timer)
  }, [handleDismiss])

  return (
    <div className={`notification-card ${isExiting ? 'exiting' : ''}`} onClick={handleDismiss}>
      <div className="notification-avatar">
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name}
            className="notification-avatar-img"
            draggable={false}
          />
        ) : (
          <div className="notification-avatar-placeholder">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="notification-content">
        <div className="notification-steam-header">
          <img src={steamLogo} alt="Steam" className="notification-steam-logo" draggable={false} />
        </div>
        <div className="notification-divider" />
        <div className="notification-title">
          {name} instalado correctamente
        </div>
        <div className="notification-subtitle">Listo para jugar</div>
      </div>
    </div>
  )
}
