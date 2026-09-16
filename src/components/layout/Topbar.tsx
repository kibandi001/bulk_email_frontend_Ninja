import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import './Topbar.css';

interface TopbarProps {
  title: string;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  user: 'User',
  campaign_manager: 'Campaign Manager',
  auditor: 'Auditor',
  app_integrator: 'Application Integrator',
};

export function Topbar({
  title,
  collapsed,
  onToggleSidebar,
}: TopbarProps) {
  const { user, logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);


  /*
   * Build avatar initials from the email prefix.
   *
   * brian.muthuka@nca.go.ke -> BM
   * brian@nca.go.ke         -> B
   */
  function getEmailInitials(email?: string) {
    if (!email) {
      return 'U';
    }

    const prefix = email.split('@')[0].trim();

    if (!prefix) {
      return 'U';
    }

    const parts = prefix
      .split(/[._\-\s]+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) +
        parts[1].charAt(0)
      ).toUpperCase();
    }

    return prefix
      .slice(0, 2)
      .toUpperCase();
  }

  /*
   * Display the email prefix nicely.
   *
   * brian.muthuka@nca.go.ke -> brian.muthuka
   */
  function getEmailPrefix(email?: string) {
    if (!email) {
      return 'User';
    }

    return email.split('@')[0] || 'User';
  }

  /*
   * The current user type may or may not expose company
   * depending on the backend/type definition.
   *
   * Read it safely so the topbar won't break if company
   * is not currently populated.
   */
  const userWithCompany = user as
    | (typeof user & {
        company?: string;
        companyName?: string;
      })
    | null;

  const company =
    userWithCompany?.company ||
    userWithCompany?.companyName ||
    'NCA';

  const email =
    userWithCompany?.email || '';

  const role =
    userWithCompany?.role
      ? ROLE_LABELS[userWithCompany.role] ??
        userWithCompany.role.replace('_', ' ')
      : 'User';

  /*
   * Close profile dropdown when clicking anywhere outside it.
   */
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target as Node
        )
      ) {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener(
        'mousedown',
        handleOutsideClick
      );
    }

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, [profileOpen]);

  /*
   * Close profile dropdown when pressing Escape.
   */
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    }

    if (profileOpen) {
      document.addEventListener(
        'keydown',
        handleEscape
      );
    }

    return () => {
      document.removeEventListener(
        'keydown',
        handleEscape
      );
    };
  }, [profileOpen]);

  function handleLogout() {
    setProfileOpen(false);
    logout();
  }

  return (
    <header className="topbar">
      {/* Left side */}
      <div className="topbar__left">
        {onToggleSidebar && (
          <button
            type="button"
            className="topbar__sidebar-toggle"
            onClick={onToggleSidebar}
            title={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            aria-label={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >
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
              <line
                x1="3"
                y1="12"
                x2="21"
                y2="12"
              />
              <line
                x1="3"
                y1="6"
                x2="21"
                y2="6"
              />
              <line
                x1="3"
                y1="18"
                x2="21"
                y2="18"
              />
            </svg>
          </button>
        )}

        <h1 className="topbar__title">
          {title}
        </h1>
      </div>

      {/* Right side */}
      <div className="topbar__right">
        {/* Profile */}
        {user && (
          <div
            className="topbar__profile"
            ref={profileRef}
          >
            <button
              type="button"
              className={`topbar__profile-trigger${
                profileOpen
                  ? ' topbar__profile-trigger--open'
                  : ''
              }`}
              onClick={() =>
                setProfileOpen(
                  (current) => !current
                )
              }
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              title="Open profile menu"
            >
              <span
                className="topbar__avatar"
                aria-hidden="true"
              >
                {getEmailInitials(email)}
              </span>

              <span className="topbar__profile-copy">
                <span className="topbar__profile-name">
                  {getEmailPrefix(email)}
                </span>

                <span className="topbar__profile-role">
                  {role}
                </span>
              </span>

              <svg
                className={`topbar__profile-chevron${
                  profileOpen
                    ? ' topbar__profile-chevron--open'
                    : ''
                }`}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Dropdown */}
            {profileOpen && (
              <div
                className="topbar__profile-menu"
                role="menu"
              >
                {/* User identity */}
                <div className="topbar__profile-header">
                  <div className="topbar__profile-large-avatar">
                    {getEmailInitials(email)}
                  </div>

                  <div className="topbar__profile-header-copy">
                    <strong>
                      {getEmailPrefix(email)}
                    </strong>

                    <span title={email}>
                      {email}
                    </span>
                  </div>
                </div>

                <div className="topbar__profile-divider" />

                {/* Role */}
                <div className="topbar__profile-detail">
                  <span className="topbar__profile-detail-icon">
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
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle
                        cx="12"
                        cy="7"
                        r="4"
                      />
                    </svg>
                  </span>

                  <div>
                    <span className="topbar__profile-detail-label">
                      Role
                    </span>

                    <span className="topbar__profile-detail-value">
                      {role}
                    </span>
                  </div>
                </div>

                {/* Company */}
                <div className="topbar__profile-detail">
                  <span className="topbar__profile-detail-icon">
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
                      <path d="M3 21h18" />
                      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
                      <path d="M9 7h1" />
                      <path d="M14 7h1" />
                      <path d="M9 11h1" />
                      <path d="M14 11h1" />
                      <path d="M9 15h1" />
                      <path d="M14 15h1" />
                    </svg>
                  </span>

                  <div>
                    <span className="topbar__profile-detail-label">
                      Company
                    </span>

                    <span className="topbar__profile-detail-value">
                      {company}
                    </span>
                  </div>
                </div>

                <div className="topbar__profile-divider" />

                {/* Sign out */}
                <button
                  type="button"
                  className="topbar__profile-signout"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  <svg
                    width="16"
                    height="16"
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
                    <line
                      x1="21"
                      y1="12"
                      x2="9"
                      y2="12"
                    />
                  </svg>

                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}