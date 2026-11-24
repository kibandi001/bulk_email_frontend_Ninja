import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { listCompanies } from '../../services/companyService';
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const minutes = Math.floor(sessionExpiresInMs / 60000);
  const seconds = Math.floor((sessionExpiresInMs % 60000) / 1000);
  const low = sessionExpiresInMs < 2 * 60 * 1000;

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch company name
  useEffect(() => {
    if (user?.companyName) {
      setCompanyName(user.companyName);
      return;
    }

    const companyId = user?.companyId;
    let isMounted = true;

    listCompanies()
      .then((companies) => {
        if (!isMounted) return;
        if (companyId) {
          const match = companies.find((c) => c.id === companyId);
          if (match) {
            setCompanyName(match.name);
            return;
          }
        }
        if (companies.length === 1) {
          setCompanyName(companies[0].name);
        }
      })
      .catch((err) => {
        console.warn('Could not load company for topbar:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Compute initials from user's name
  const initials = user?.name
    ? user.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'U';

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

          {/* Circular Profile Avatar & Dropdown */}
          {user && (
            <div className="topbar__profile-container" ref={profileRef}>
              <button
                type="button"
                className="topbar__avatar-btn"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                aria-label="User profile menu"
                title={user.name}
              >
                <span className="topbar__avatar-initials">{initials}</span>
              </button>

              {isProfileOpen && (
                <div className="topbar__profile-dropdown">
                  <div className="topbar__dropdown-header">
                    <div className="topbar__dropdown-avatar">{initials}</div>
                    <div className="topbar__dropdown-user-info">
                      <span className="topbar__dropdown-name">{user.name}</span>
                      {user.email && (
                        <span className="topbar__dropdown-email">{user.email}</span>
                      )}
                      <div className="topbar__dropdown-meta">
                        <span className="topbar__dropdown-role">
                          {user.role.replace('_', ' ')}
                        </span>
                        {companyName && (
                          <span className="topbar__dropdown-company" title="Organization">
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                              <path d="M9 22v-4h6v4" />
                              <path d="M8 6h.01" />
                              <path d="M16 6h.01" />
                              <path d="M8 10h.01" />
                              <path d="M16 10h.01" />
                            </svg>
                            {companyName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="topbar__dropdown-divider" />

                  <button
                    type="button"
                    className="topbar__dropdown-item topbar__dropdown-item--logout"
                    onClick={() => {
                      setIsProfileOpen(false);
                      logout();
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
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
