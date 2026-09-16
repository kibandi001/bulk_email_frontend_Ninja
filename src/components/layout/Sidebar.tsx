import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import './Sidebar.css';

interface NavItem {
  to: string;
  label: string;
  roles?: UserRole[];
  icon: ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        to: '/',
        label: 'Dashboard',
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },

  {
    label: 'Campaigns',
    items: [
      {
        to: '/campaigns',
        label: 'Campaign Studio',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22 6 12 13 2 6" />
          </svg>
        ),
      },
    ],
  },

  {
    label: 'Templates',
    items: [
      {
        to: '/templates',
        label: 'Template Library',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      },
    ],
  },

  {
    label: 'Audience',
    items: [
      {
        to: '/contacts',
        label: 'Contacts & Lists',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },

      {
        to: '/hygiene',
        label: 'Data Hygiene',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
    ],
  },

  {
    label: 'Insight',
    items: [
      {
        to: '/analytics',
        label: 'Analytics',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        ),
      },

      {
        to: '/reports',
        label: 'Reports',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            <polyline points="17 8 12 13 9 10" />
          </svg>
        ),
      },

      {
        to: '/messages',
        label: 'Message Log',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
    ],
  },

  {
    label: 'Administration',
    items: [
      {
        to: '/quota',
        label: 'Quota & Alerts',
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      },

      {
        to: '/users',
        label: 'User Administration',
        roles: ['admin'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="7" r="4" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
        ),
      },

      {
        to: '/companies',
        label: 'Companies',
        roles: ['admin'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="16" y2="14" />
          </svg>
        ),
      },

      {
        to: '/wallets',
        label: 'Wallets',
        roles: ['admin'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              x="1"
              y="4"
              width="22"
              height="16"
              rx="2"
            />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        ),
      },

      {
        to: '/request-logs',
        label: 'Request Logs',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        ),
      },

      {
        to: '/roles',
        label: 'Roles & Permissions',
        roles: ['admin'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
            />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ),
      },

      {
        to: '/audit',
        label: 'Audit Log',
        roles: ['admin', 'user'],
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        ),
      },

      {
        to: '/status',
        label: 'System Status',
        icon: (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        ),
      },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggle?: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onToggle,
  onCloseMobile,
}: SidebarProps) {
  const { hasRole } = useAuth();

  return (
    <nav
      className={[
        'sidebar',
        collapsed ? 'sidebar--collapsed' : '',
        mobileOpen ? 'sidebar--mobile-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Primary navigation"
    >
      {/* ============================
          HEADER
      ============================= */}
      <div className="sidebar__header">
        <NavLink
          to="/"
          className="sidebar__brand"
          onClick={onCloseMobile}
          aria-label="Go to dashboard"
          title={collapsed ? 'Bulk Email Console' : undefined}
        >
          <span className="sidebar__brand-mark">
            NCA
          </span>

          <div className="sidebar__brand-copy">
            <p className="sidebar__brand-title">
              Bulk Email Console
            </p>

            <p className="sidebar__brand-sub">
              mail.nca.go.ke
            </p>
          </div>
        </NavLink>

        {/* Top collapse / expand button */}
        {onToggle && (
          <button
            type="button"
            className="sidebar__toggle"
            onClick={onToggle}
            aria-label={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            title={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3.25"
                y="4"
                width="17.5"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
              />

              <line
                x1="9"
                y1="4.5"
                x2="9"
                y2="19.5"
                stroke="currentColor"
                strokeWidth="1.7"
              />
            </svg>
          </button>
        )}
      </div>

      {/* ============================
          NAVIGATION
      ============================= */}
      <div className="sidebar__scroll">
        {GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) =>
              !item.roles ||
              hasRole(...item.roles)
          );

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <section
              className="sidebar__group"
              key={group.label}
            >
              <div className="sidebar__group-label">
                {group.label}
              </div>

              <div className="sidebar__group-items">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onCloseMobile}
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={({ isActive }) =>
                      [
                        'sidebar__link',
                        isActive
                          ? 'sidebar__link--active'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')
                    }
                  >
                    <span
                      className="sidebar__link-icon"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>

                    <span className="sidebar__link-text">
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </nav>
  );
}