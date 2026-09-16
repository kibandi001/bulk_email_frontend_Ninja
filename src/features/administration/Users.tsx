import { useEffect, useState } from 'react';
import { deleteUser, inviteUser, listUsers, updateUser } from '../../services/adminService';
import { listCompanies } from '../../services/companyService';
import type { Company, ManagedUser } from '../../types';
import { Card } from '../../components/ui/Card';

const PAGE_SIZE = 20;

export function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  function loadUsers() {
    listUsers(PAGE_SIZE, offset)
      .then(({ users, total }) => {
        setUsers(users);
        setTotal(total);
      })
      .catch(() => setError('Could not load users.'));
  }

  useEffect(loadUsers, [offset]);

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
      // Invitations aren't listed by the API (no "list invitations" endpoint),
      // so there's nothing to add to this table until the person accepts and
      // shows up in /all-users/list/ on its own.
    } catch {
      setError('Could not send the invitation.');
    }
  }

  async function handleToggleAdmin(user: ManagedUser) {
    setError(null);
    try {
      const updated = await updateUser({ ...user, isAdmin: !user.isAdmin });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      setError('Could not update that user.');
    } finally {
      setEditingId(null);
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

  return (
    <div>
      <p className="section-intro">
        Enable or disable administrator access, and invite new users to a company. Every account
        is personal — shared logins are not permitted.
      </p>

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
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td className="mono">{u.email}</td>
                <td className="mono">{u.phone ?? '—'}</td>
                <td>{companies.find((c) => c.id === u.companyId)?.name ?? u.companyId ?? '—'}</td>
                <td>{u.isAdmin ? 'Administrator' : 'Standard'}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn"
                    disabled={editingId === u.id}
                    onClick={() => {
                      setEditingId(u.id);
                      handleToggleAdmin(u);
                    }}
                  >
                    {u.isAdmin ? 'Revoke admin' : 'Make admin'}
                  </button>
                  <button className="btn" onClick={() => handleDelete(u)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
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
    </div>
  );
}
