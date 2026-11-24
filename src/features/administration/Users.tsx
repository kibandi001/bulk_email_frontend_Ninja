import { useEffect, useMemo, useState } from 'react';
import {
  deleteUser,
  getUser,
  inviteUser,
  listUsers,
  updateUser,
} from '../../services/adminService';
import { listCompanies } from '../../services/companyService';
import type { Company, ManagedUser } from '../../types';
import { Card } from '../../components/ui/Card';
import './Users.css';

const PAGE_SIZE = 20;

type UserFilters = {
  search: string;
  companyId: number | '';
  roleFilter: 'all' | 'admin' | 'user';
};

const EMPTY_FILTERS: UserFilters = { search: '', companyId: '', roleFilter: 'all' };

/* ------------------------------------------------------------------ */
/*  Avatar color generator based on string hash                        */
/* ------------------------------------------------------------------ */
function getAvatarStyle(name: string) {
  const colors = [
    { bg: '#e7eff5', fg: '#1c5a8c' }, // Blueprint
    { bg: '#e6f0ea', fg: '#2e7d5b' }, // Verified green
    { bg: '#f7ecd9', fg: '#c8892a' }, // Amber
    { bg: '#ede7f6', fg: '#5e35b1' }, // Deep purple
    { bg: '#e0f2f1', fg: '#00796b' }, // Teal
    { bg: '#fce4ec', fg: '#c2185b' }, // Crimson
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];
  return { backgroundColor: color.bg, color: color.fg };
}

function isGenericName(name?: string | null): boolean {
  if (!name) return true;
  const lower = name.trim().toLowerCase();
  return (
    lower === '' ||
    lower === 'user' ||
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'none' ||
    lower === 'null' ||
    lower === 'undefined'
  );
}

function formatNameFromEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'User';
  const handle = email.split('@')[0];
  const words = handle
    .replace(/[._-]+/g, ' ')
    .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w, _, arr) => arr.length === 1 || !/^\d+$/.test(w));

  if (!words.length) return 'User';

  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getUserDisplayName(user: ManagedUser): { displayName: string; handleTag: string | null } {
  if (user.fullName && !isGenericName(user.fullName)) {
    return {
      displayName: user.fullName,
      handleTag: user.username && !isGenericName(user.username) ? `@${user.username}` : null,
    };
  }

  if (user.username && !isGenericName(user.username)) {
    const formatted = user.username
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return { displayName: formatted, handleTag: null };
  }

  const fromEmail = formatNameFromEmail(user.email);
  return { displayName: fromEmail, handleTag: null };
}

function getInitials(name: string): string {
  if (!name || isGenericName(name)) return 'US';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Access badge                                                      */
/* ------------------------------------------------------------------ */
function AccessBadge({ isAdmin }: { isAdmin: boolean }) {
  if (isAdmin) {
    return (
      <span className="badge-role badge-role--admin" title="Administrator privileges">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Admin
      </span>
    );
  }
  return (
    <span className="badge-role badge-role--user">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      User
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm Delete Modal                                               */
/* ------------------------------------------------------------------ */
function ConfirmDeleteModal({
  user,
  onClose,
  onConfirm,
  deleting,
}: {
  user: ManagedUser;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onClose();
      }}
    >
      <div className="modal-dialog modal-dialog--danger">
        <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '3px solid var(--alert)', borderLeft: '3px solid var(--alert)' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottom: '3px solid var(--alert)', borderRight: '3px solid var(--alert)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--alert-dim)', color: 'var(--alert)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--ink)' }}>Remove user</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>This action cannot be undone.</p>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--ink)', margin: '14px 0 20px', lineHeight: 1.5 }}>
          Are you sure you want to remove <strong>{getUserDisplayName(user).displayName || user.email}</strong>? They will lose access to all company campaigns and logs immediately.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="btn"
            style={{ background: 'var(--alert)', borderColor: 'var(--alert)', color: '#fff' }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Removing…' : 'Yes, remove user'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit-user modal                                                    */
/* ------------------------------------------------------------------ */
function EditUserModal({
  user,
  companies,
  onClose,
  onSaved,
}: {
  user: ManagedUser;
  companies: Company[];
  onClose: () => void;
  onSaved: (updated: ManagedUser) => void;
}) {
  const [fullName, setFullName] = useState(
    user.fullName || (user.username && !isGenericName(user.username) ? user.username : formatNameFromEmail(user.email))
  );
  const [email, setEmail] = useState(user.email ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [companyId, setCompanyId] = useState<number | ''>(user.companyId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function normalizePhone(raw: string): string | null {
    const digitsOnly = raw.replace(/[^\d]/g, '');
    let normalized = digitsOnly;
    if (normalized.startsWith('0')) {
      normalized = '254' + normalized.slice(1);
    } else if (normalized.length === 9) {
      normalized = '254' + normalized;
    }
    return /^\d{12}$/.test(normalized) ? normalized : null;
  }

  async function handleSave() {
    if (!fullName.trim() || !email.trim()) {
      setError('Full name and email are required.');
      return;
    }

    let normalizedPhone: string | null = null;
    if (phone.trim()) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        setError('Enter a valid phone number, e.g. 0718292830 or 254718292830.');
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateUser({
        ...user,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: normalizedPhone,
        companyId: companyId === '' ? null : Number(companyId),
      });
      onSaved(updated);
    } catch {
      setError('Could not save the changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${user.username || user.email}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog">
        <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '3px solid var(--blueprint)', borderLeft: '3px solid var(--blueprint)' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottom: '3px solid var(--blueprint)', borderRight: '3px solid var(--blueprint)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>
              Edit user profile
            </h2>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
              {user.username ? `Username: ${user.username}` : user.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="users-search-clear"
            title="Close dialog"
            style={{ position: 'static', transform: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="edit-fullname">Full name</label>
          <input
            id="edit-fullname"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="edit-email">Email address</label>
          <input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="edit-phone">Phone number</label>
          <input
            id="edit-phone"
            type="tel"
            placeholder="0718292830 or 254718292830"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="edit-company">Assigned company</label>
          <select
            id="edit-company"
            value={companyId}
            onChange={(e) =>
              setCompanyId(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">No company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="users-alert users-alert--error" style={{ padding: '8px 12px', fontSize: 12.5 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving changes…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState<number | ''>('');
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draftFilters, setDraftFilters] = useState<UserFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>(EMPTY_FILTERS);

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filterKey = useMemo(
    () => `${appliedFilters.search}|${appliedFilters.companyId}|${appliedFilters.roleFilter}`,
    [appliedFilters]
  );

  function loadUsers() {
    listUsers(PAGE_SIZE, offset)
      .then(({ users: fetchedUsers, total: totalCount }) => {
        const filtered = fetchedUsers.filter((u) => {
          const search = appliedFilters.search.trim().toLowerCase();
          const matchesSearch =
            !search ||
            [u.username, u.email, u.phone, u.fullName]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(search));

          const matchesCompany =
            appliedFilters.companyId === '' || u.companyId === appliedFilters.companyId;

          const matchesRole =
            appliedFilters.roleFilter === 'all' ||
            (appliedFilters.roleFilter === 'admin' && u.isAdmin) ||
            (appliedFilters.roleFilter === 'user' && !u.isAdmin);

          return matchesSearch && matchesCompany && matchesRole;
        });

        setUsers(filtered);
        const resolvedTotal =
          typeof totalCount === 'number' && !isNaN(totalCount)
            ? totalCount
            : fetchedUsers.length;
        setTotal(resolvedTotal);
      })
      .catch(() => setError('Could not load users.'));
  }

  useEffect(loadUsers, [offset, filterKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    listCompanies()
      .then(setCompanies)
      .catch(() => {
        /* Company picker just stays empty; invite still works with raw id */
      });
  }, []);

  async function handleInvite(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!inviteEmail.trim() || inviteCompanyId === '') return;
    setError(null);
    setInviting(true);
    try {
      await inviteUser(inviteEmail.trim(), Number(inviteCompanyId));
      const targetCompany = companies.find((c) => c.id === Number(inviteCompanyId))?.name || 'company';
      setSuccessMessage(`Invitation successfully sent to ${inviteEmail.trim()} (${targetCompany}).`);
      setInviteEmail('');
      setInviteCompanyId('');
      setShowInviteDrawer(false);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch {
      setError('Could not send the invitation. Please verify the email.');
    } finally {
      setInviting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!userToDelete) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
      setSuccessMessage(`User ${userToDelete.username || userToDelete.email} was removed.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      loadUsers();
    } catch {
      setError('Could not remove that user.');
    } finally {
      setDeleting(false);
    }
  }

  function handleSearch() {
    setOffset(0);
    setAppliedFilters(draftFilters);
  }

  function handleClear() {
    setDraftFilters(EMPTY_FILTERS);
    setOffset(0);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function handleUserSaved(updated: ManagedUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditingUser(null);
    setSuccessMessage(`Updated profile for ${updated.username || updated.email}.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  async function handleEditClick(user: ManagedUser) {
    setError(null);
    setLoadingEditId(user.id);
    try {
      const full = await getUser(user.id);
      setEditingUser(full);
    } catch {
      setError("Could not load that user's details.");
    } finally {
      setLoadingEditId(null);
    }
  }

  // Quick stat computations
  const adminCount = useMemo(() => users.filter((u) => u.isAdmin).length, [users]);
  const hasActiveFilters =
    appliedFilters.search !== '' ||
    appliedFilters.companyId !== '' ||
    appliedFilters.roleFilter !== 'all';

  return (
    <div className="users-page">
      {/* Introduction banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="section-intro" style={{ margin: 0 }}>
            Manage user accounts, toggle administrator privileges, and invite colleagues to their designated companies.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="users-stats">
        <div className="users-stat-card">
          <div className="users-stat-icon users-stat-icon--users">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="users-stat-info">
            <span className="users-stat-label">Total Users</span>
            <span className="users-stat-value">
              {typeof total === 'number' && !isNaN(total) ? total : users.length}
            </span>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon users-stat-icon--admins">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="users-stat-info">
            <span className="users-stat-label">Admins on Page</span>
            <span className="users-stat-value">{adminCount}</span>
          </div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon users-stat-icon--companies">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div className="users-stat-info">
            <span className="users-stat-label">Registered Companies</span>
            <span className="users-stat-value">{companies.length}</span>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="users-alert users-alert--success">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            className="users-search-clear"
            style={{ position: 'static', transform: 'none' }}
            onClick={() => setSuccessMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="users-alert users-alert--error">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            className="users-search-clear"
            style={{ position: 'static', transform: 'none' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Expandable Invite User Panel */}
      {showInviteDrawer && (
        <div className="users-invite-panel">
          <div className="users-invite-header">
            <span className="users-invite-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
              Invite a new user to platform
            </span>
            <button
              className="users-search-clear"
              style={{ position: 'static', transform: 'none' }}
              onClick={() => setShowInviteDrawer(false)}
              title="Close invite panel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleInvite} className="users-invite-grid">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="invite-email">User email address</label>
              <input
                id="invite-email"
                type="email"
                placeholder="colleague@domain.ke"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="invite-company">Assign to company</label>
              <select
                id="invite-company"
                value={inviteCompanyId}
                onChange={(e) => setInviteCompanyId(e.target.value ? Number(e.target.value) : '')}
                required
              >
                <option value="">Select company…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={inviting || !inviteEmail.trim() || inviteCompanyId === ''}
                style={{ height: 36, whiteSpace: 'nowrap' }}
              >
                {inviting ? 'Sending invite…' : 'Send invitation'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setShowInviteDrawer(false)}
                style={{ height: 36 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Table Card */}
      <Card
        title="Managed accounts"
        eyebrow={`${typeof total === 'number' && !isNaN(total) ? total : users.length} total users registered`}
        actions={
          <button
            className="btn btn--primary"
            onClick={() => setShowInviteDrawer((prev) => !prev)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {showInviteDrawer ? 'Hide invite form' : 'Invite user'}
          </button>
        }
      >
        {/* Toolbar & Filter Bar */}
        <div className="users-toolbar">
          <div className="users-search-group">
            {/* Search Input */}
            <div className="users-search-input-wrapper">
              <svg className="users-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="users-search-input"
                type="text"
                placeholder="Search name, email, phone or username…"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters({ ...draftFilters, search: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
              />
              {draftFilters.search && (
                <button
                  className="users-search-clear"
                  onClick={() => {
                    setDraftFilters({ ...draftFilters, search: '' });
                    setAppliedFilters({ ...appliedFilters, search: '' });
                  }}
                  title="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Company Dropdown */}
            <select
              className="users-filter-select"
              value={draftFilters.companyId}
              onChange={(e) =>
                setDraftFilters({
                  ...draftFilters,
                  companyId: e.target.value ? Number(e.target.value) : '',
                })
              }
            >
              <option value="">All companies ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              className="users-filter-select"
              style={{ minWidth: 130 }}
              value={draftFilters.roleFilter}
              onChange={(e) =>
                setDraftFilters({
                  ...draftFilters,
                  roleFilter: e.target.value as 'all' | 'admin' | 'user',
                })
              }
            >
              <option value="all">All roles</option>
              <option value="admin">Admins only</option>
              <option value="user">Standard users</option>
            </select>
          </div>

          <div className="users-actions-group">
            <button className="btn btn--primary" onClick={handleSearch} style={{ height: 36 }}>
              Apply filters
            </button>
            {hasActiveFilters && (
              <button className="btn" onClick={handleClear} style={{ height: 36 }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User / Member</th>
                <th>Contact email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Role & Access</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const { displayName, handleTag } = getUserDisplayName(u);
                const avatarStyle = getAvatarStyle(displayName);
                const companyName = companies.find((c) => c.id === u.companyId)?.name;

                return (
                  <tr
                    key={u.id}
                    style={{
                      backgroundColor: i % 2 === 0 ? 'var(--paper)' : 'transparent',
                    }}
                  >
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar" style={avatarStyle}>
                          {getInitials(displayName)}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{displayName}</span>
                          {handleTag && (
                            <span className="user-username-tag">{handleTag}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="mono" style={{ color: 'var(--ink)' }}>
                      {u.email || '—'}
                    </td>

                    <td className="mono" style={{ color: u.phone ? 'var(--ink)' : 'var(--muted)' }}>
                      {u.phone ?? '—'}
                    </td>

                    <td>
                      {companyName ? (
                        <span className="company-tag">
                          <span className="company-dot" />
                          {companyName}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 13 }}>—</span>
                      )}
                    </td>

                    <td>
                      <AccessBadge isAdmin={!!u.isAdmin} />
                    </td>

                    <td>
                      <div className="row-actions">
                        <button
                          className="btn-action"
                          onClick={() => handleEditClick(u)}
                          disabled={loadingEditId === u.id}
                          title="Edit user details"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          {loadingEditId === u.id ? 'Loading…' : 'Edit'}
                        </button>

                        <button
                          className="btn-action btn-action--danger"
                          onClick={() => setUserToDelete(u)}
                          title="Remove user"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </div>
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>No users found matching current filters</span>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                        Try clearing your search terms or selecting a different company.
                      </p>
                      {hasActiveFilters && (
                        <button className="btn" onClick={handleClear} style={{ marginTop: 6 }}>
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="users-pagination">
          <div className="users-pagination-info">
            {total > 0 ? (
              <>
                Showing <strong>{offset + 1}</strong>–<strong>{Math.min(offset + PAGE_SIZE, total)}</strong> of{' '}
                <strong>{total}</strong> users
              </>
            ) : (
              '0 users'
            )}
          </div>

          <div className="users-pagination-controls">
            <button
              className="btn"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Previous
            </button>

            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)', padding: '0 4px' }}>
              Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>

            <button
              className="btn"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          companies={companies}
          onClose={() => setEditingUser(null)}
          onSaved={handleUserSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <ConfirmDeleteModal
          user={userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}