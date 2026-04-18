import { useEffect, useState } from 'react';
import { socket } from '../../services/socket';

interface Notification {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'emergency';
  timestamp: number;
}

export default function NotificationToast() {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    socket.on('notification', (data: Notification) => {
      setNotification(data);
      setVisible(true);
      
      // Auto-hide after 15 seconds if it's info/warning, but stay for emergency
      if (data.type !== 'emergency') {
        const timer = setTimeout(() => {
          setVisible(false);
        }, 15000);
        return () => clearTimeout(timer);
      }
    });

    return () => {
      socket.off('notification');
    };
  }, []);

  if (!notification || !visible) return null;

  return (
    <div className={`notification-toast notification-toast--${notification.type}`} role="alert" aria-live="assertive">
      <div className="notification-toast__content">
        <h3 className="notification-toast__title">{notification.title}</h3>
        <p className="notification-toast__message">{notification.message}</p>
        <span className="notification-toast__time">
          Just now • {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <button 
        className="notification-toast__close" 
        onClick={() => setVisible(false)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}
