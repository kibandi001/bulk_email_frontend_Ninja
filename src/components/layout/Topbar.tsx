import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

interface TopbarProps {
  title: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ title, collapsed, onToggleSidebar }: TopbarProps) {
  const { user, logout, sessionExpiresInMs } = useAuth();

  const minutes = Math.floor(sessionExpiresInMs / 60000);
  const seconds = Math.floor((sessionExpiresInMs % 60000) / 1000);
  const low = sessionExpiresInMs < 2 * 60 * 1000;

  return (
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

        <button className="topbar__logout" onClick={logout}>
          Sign out
        </button>
      </div>
    </header>
  );
}