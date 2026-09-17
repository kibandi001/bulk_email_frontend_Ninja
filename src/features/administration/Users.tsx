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

const PAGE_SIZE = 20;

type UserFilters = {
  search: string;
  companyId: number | '';
};

const EMPTY_FILTERS: UserFilters = { search: '', companyId: '' };

/* ------------------------------------------------------------------ */
/*  Access badge — inline styles only, no global CSS                   */
/* ------------------------------------------------------------------ */
function AccessBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 12px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        color: '#ffffff',
        textAlign: 'center',
        minWidth: 54,
        backgroundColor: isAdmin ? '#10b981' : '#f59e0b',
      }}
    >
      {isAdmin ? 'admin' : 'user'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter bar                                                         */
/* ------------------------------------------------------------------ */
function UserFilter({
  companies,
  filters,
  onChange,
  onSearch,
  onClear,
}: {
  companies: Company[];
  filters: UserFilters;
  onChange: (next: UserFilters) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        gap: 16,
        padding: '16px 18px',
        marginBottom: 20,
        background: '#ffffff',
        border: '1px solid #ddd9cf',
        borderRadius: 6,
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '3px solid #12629a', borderLeft: '3px solid #12629a' }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: '3px solid #12629a', borderRight: '3px solid #12629a' }} />

      <div className="field" style={{ margin: 0, minWidth: 240, flex: '1 1 240px' }}>
        <label
          htmlFor="user-search"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#765f47',
          }}
        >
          Search
        </label>
        <input
          id="user-search"
          type="text"
          placeholder="Name, email or phone…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearch();
          }}
        />
      </div>

      <div className="field" style={{ margin: 0, minWidth: 200, flex: '0 1 200px' }}>
        <label
          htmlFor="user-company-filter"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: '#765f47',
          }}
        >
          Company
        </label>
        <select
          id="user-company-filter"
          value={filters.companyId}
          onChange={(e) =>
            onChange({
              ...filters,
              companyId: e.target.value ? Number(e.target.value) : '',
            })
          }
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn--primary" onClick={onSearch}>
          Search
        </button>
        <button className="btn" onClick={onClear}>
          Clear
        </button>
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
  const [fullName, setFullName] = useState(user.fullName ?? '');
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

  // The backend enforces a 12-digit phone format (country code, no leading
  // zero — e.g. 254714862457). Normalize common local formats into that
  // shape; return null if the result still isn't a valid 12-digit number.
  function normalizePhone(raw: string): string | null {
    const digitsOnly = raw.replace(/[^\d]/g, '');
    let normalized = digitsOnly;
    if (normalized.startsWith('0')) {
      normalized = '254' + normalized.slice(1);
    } else if (normalized.length === 9) {
      // bare subscriber number, e.g. 7XXXXXXXX or 1XXXXXXXX
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
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${user.username || user.email}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 29, 56, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#ffffff',
          borderRadius: 6,
          padding: '24px 26px',
          boxShadow: '0 24px 48px rgba(15, 35, 60, 0.28)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '3px solid #12629a', borderLeft: '3px solid #12629a' }} />
        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderBottom: '3px solid #12629a', borderRight: '3px solid #12629a' }} />

        <h2 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 600, color: '#061d38' }}>
          Edit user
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7280' }}>
          {user.username ? `Username: ${user.username}` : user.email}
        </p>

        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="edit-fullname">Full name</label>
          <input
            id="edit-fullname"
            type="text"
            placeholder="N/A"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label htmlFor="edit-email">Email</label>
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
          <label htmlFor="edit-company">Company</label>
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

        {error && <p className="login__error">{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const [draftFilters, setDraftFilters] = useState<UserFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<UserFilters>(EMPTY_FILTERS);

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);

  const filterKey = useMemo(
    () => `${appliedFilters.search}|${appliedFilters.companyId}`,
    [appliedFilters]
  );

  function loadUsers() {
    listUsers(PAGE_SIZE, offset)
      .then(({ users, total }) => {
        // listUsers has no server-side filtering, so filter within the
        // current page here. Note this only filters what's already
        // loaded on this page, not the whole dataset.
        const filtered = users.filter((u) => {
          const search = appliedFilters.search.trim().toLowerCase();
          const matchesSearch =
            !search ||
            [u.username, u.email, u.phone]
              .filter(Boolean)
              .some((v) => v!.toLowerCase().includes(search));
          const matchesCompany =
            appliedFilters.companyId === '' || u.companyId === appliedFilters.companyId;
          return matchesSearch && matchesCompany;
        });
        setUsers(filtered);
        setTotal(total);
      })
      .catch(() => setError('Could not load users.'));
  }

  useEffect(loadUsers, [offset, filterKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    listCompanies()
      .then(setCompanies)
      .catch(() => {
        /* Company picker just stays empty; invite still works with a raw id if needed. */
      });
  }, []);

  async function handleInvite() {
    if (!inviteEmail.trim() || inviteCompanyId === '') return;
    setError(null);
    try {
      await inviteUser(inviteEmail.trim(), Number(inviteCompanyId));
      setInviteEmail('');
      setInviteCompanyId('');
    } catch {
      setError('Could not send the invitation.');
    }
  }

  async function handleDelete(user: ManagedUser) {
    setError(null);
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch {
      setError('Could not remove that user.');
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
  }

  // Fetch the full record by id before opening the modal, since the
  // paginated list endpoint doesn't return every field (e.g. phone).
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

  return (
    <div>
      <p className="section-intro">
        Enable or disable administrator access, and invite new users to a company. Every account
        is personal — shared logins are not permitted.
      </p>

      <UserFilter
        companies={companies}
        filters={draftFilters}
        onChange={setDraftFilters}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <Card title="Invite a user">
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="invite-email">Email</label>
          <input
            id="invite-email"
            type="email"
            placeholder="new-user@nca.ke"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="invite-company">Company</label>
          <select
            id="invite-company"
            value={inviteCompanyId}
            onChange={(e) => setInviteCompanyId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="login__error">{error}</p>}
        <button className="btn btn--primary" onClick={handleInvite}>
          Send invitation
        </button>
      </Card>

      <Card title="NCA users" eyebrow={`${total} total`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Company</th>
              <th>Access</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                style={{
                  backgroundColor: i % 2 === 0 ? 'var(--row-alt, #f7f7f9)' : 'transparent',
                }}
              >
                <td>{u.username || 'N/A'}</td>
                <td className="mono">{u.email || 'N/A'}</td>
                <td className="mono">{u.phone ?? '—'}</td>
                <td>{companies.find((c) => c.id === u.companyId)?.name ?? u.companyId ?? '—'}</td>
                <td>
                  <AccessBadge isAdmin={!!u.isAdmin} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      className="btn"
                      onClick={() => handleEditClick(u)}
                      disabled={loadingEditId === u.id}
                    >
                      {loadingEditId === u.id ? 'Loading…' : 'Edit'}
                    </button>
                    <button className="btn" onClick={() => handleDelete(u)}>
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#6b7280', padding: '20px 0' }}>
                  No users match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button
            className="btn"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </button>
          <button
            className="btn"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </button>
        </div>
      </Card>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          companies={companies}
          onClose={() => setEditingUser(null)}
          onSaved={handleUserSaved}
        />
      )}
    </div>
  );
}