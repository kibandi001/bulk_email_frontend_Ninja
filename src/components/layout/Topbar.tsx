import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import './Topbar.css';

interface TopbarProps {
  title: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ title, collapsed, onToggleSidebar }: TopbarProps) {
  const { user, logout, sessionExpiresInMs } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead, clearAll } = useNotification();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const minutes = Math.floor(sessionExpiresInMs / 60000);
  const seconds = Math.floor((sessionExpiresInMs % 60000) / 1000);
  const low = sessionExpiresInMs < 2 * 60 * 1000;

  return (
    <>
      <header className="topbar">
        <div className="topbar__left">
          <button
            type="button"
            className="topbar__sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
          >
            <span />
            <span />
            <span />
          </button>

          <h1 className="topbar__title">{title}</h1>
        </div>

        <div className="topbar__right">
          {/* Notification Bell Button */}
          <button
            type="button"
            className="topbar__bell-btn"
            onClick={() => setIsNotificationOpen(true)}
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notifications"
          >
            <span className="topbar__bell-icon" aria-hidden="true">🔔</span>
            {unreadCount > 0 && (
              <span className="topbar__bell-badge">{unreadCount}</span>
            )}
          </button>

          <span
            className={`topbar__timer${low ? ' topbar__timer--low' : ''}`}
            title="Session expires on inactivity"
          >
            Session {minutes}:{seconds.toString().padStart(2, '0')}
          </span>

          {user && (
            <div className="topbar__user">
              <span className="topbar__user-name">{user.name}</span>
              <span className="topbar__user-role">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          )}

          <button type="button" className="topbar__logout" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {/* Slide-over Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markAsRead}
        onClearAll={clearAll}
      />
    </>
  );
}
