import NotificationToast from './NotificationToast';
import { useNotifications } from '../../context/NotificationContext';

const NotificationToastContainer = () => {
  const notificationContext = useNotifications();

  if (!notificationContext?.toasts?.length) {
    return null;
  }

  return (
    <div className="notification-toast-container" aria-label="New notifications">
      {notificationContext.toasts.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={notificationContext.dismissToast}
        />
      ))}
    </div>
  );
};

export default NotificationToastContainer;
