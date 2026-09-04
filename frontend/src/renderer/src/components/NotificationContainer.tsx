import Notification from './Notification'

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