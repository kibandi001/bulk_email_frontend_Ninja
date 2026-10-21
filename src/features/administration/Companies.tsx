import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createCompany, listCompanies, updateCompany } from '../../services/companyService';
import type { Company } from '../../types';
import { Card } from '../../components/ui/Card';

export function Companies() {
  const { hasRole, user } = useAuth();

  // if user is not an admin, render nothing and redirect immediately
  if (!user || !hasRole('admin')) {
    return <Navigate to="/" replace />;
  }
  const [companies, setCompanies] = useState<Company[]>([]);

  // Create form state
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [logo, setLogo] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [senderEmails, setSenderEmails] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
  const [editDomain, setEditDomain] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editLogoError, setEditLogoError] = useState(false);
  const [editSenderEmails, setEditSenderEmails] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  function load() {
    listCompanies()
      .then(setCompanies)
      .catch(() => setError('Could not load companies.'));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!name.trim() || !domain.trim()) return;
    setError(null);
    try {
      const created = await createCompany({
        name: name.trim(),
        domain: domain.trim(),
        logo: logo.trim() || undefined,
        allowedSenderEmails: senderEmails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
      });
      setCompanies((prev) => [...prev, created]);
      setName('');
      setDomain('');
      setLogo('');
      setSenderEmails('');
      setLogoError(false);
    } catch {
      setError('Could not create that company.');
    }
  }

  function openEdit(company: Company) {
    setEditingCompany(company);
    setEditName(company.name);
    setEditDomain(company.domain);
    setEditLogo(company.logo || '');
    setEditLogoError(false);
    setEditSenderEmails(company.allowedSenderEmails?.join(', ') || '');
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCompany || !editName.trim() || !editDomain.trim()) return;
    setEditError(null);
    setEditSaving(true);

    try {
      const updated = await updateCompany(editingCompany.id, {
        name: editName.trim(),
        domain: editDomain.trim(),
        logo: editLogo.trim() || undefined,
        allowedSenderEmails: editSenderEmails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
      });

      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCompany(null);
    } catch {
      setEditError('Could not update this company. Please try again.');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div>
      <p className="section-intro">
        Companies own users and control which sender addresses their campaigns may send from. Click any company to edit or add a logo.
      </p>

      {/* Add Company Card */}
      <Card title="Add a company">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
          <div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="company-name">Company Name *</label>
              <input
                id="company-name"
                placeholder="e.g. Acme Corporation"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="company-domain">Domain *</label>
              <input
                id="company-domain"
                placeholder="e.g. acme.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="company-logo">Logo Image URL</label>
              <input
                id="company-logo"
                placeholder="https://example.com/logo.png"
                value={logo}
                onChange={(e) => {
                  setLogo(e.target.value);
                  setLogoError(false);
                }}
              />
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="company-senders">Allowed sender emails (comma-separated)</label>
              <input
                id="company-senders"
                placeholder="alerts@acme.com, news@acme.com"
                value={senderEmails}
                onChange={(e) => setSenderEmails(e.target.value)}
              />
            </div>
          </div>

          {/* Logo Live Preview Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: 140,
              padding: 16,
              background: 'var(--bg-subtle, #f8fafc)',
              borderRadius: 8,
              border: '1px dashed var(--border, #cbd5e1)',
              textAlign: 'center',
              marginTop: 24,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
              LOGO PREVIEW
            </span>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: '#fff',
                border: '1px solid var(--border, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {logo && !logoError ? (
                <img
                  src={logo}
                  alt="Logo preview"
                  onError={() => setLogoError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--primary, #3b82f6)',
                    textTransform: 'uppercase',
                  }}
                >
                  {name ? name.charAt(0) : '?'}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              {logo && logoError ? 'Invalid URL' : logo ? 'Looks good!' : 'Initials fallback'}
            </span>
          </div>
        </div>

        {error && <p className="login__error" style={{ marginTop: 8 }}>{error}</p>}

        <button className="btn btn--primary" onClick={handleCreate} style={{ marginTop: 8 }}>
          Create company
        </button>
      </Card>

      {/* Companies List */}
      <Card title="Companies" eyebrow={`${companies.length} total`}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 48 }}>Logo</th>
              <th>Name</th>
              <th>Domain</th>
              <th>Allowed senders</th>
              <th style={{ width: 80, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  No companies added yet.
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openEdit(c)}
                  style={{ cursor: 'pointer' }}
                  title="Click to edit company or add logo"
                >
                  <td>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        background: '#fff',
                        border: '1px solid var(--border, #e2e8f0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {c.logo ? (
                        <img
                          src={c.logo}
                          alt={c.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerText = c.name.charAt(0).toUpperCase();
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--primary, #3b82f6)' }}>
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {c.name}
                    {!c.logo && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'var(--bg-subtle, #f1f5f9)',
                          color: 'var(--muted, #64748b)',
                          fontWeight: 500,
                        }}
                      >
                        + add logo
                      </span>
                    )}
                  </td>
                  <td className="mono">{c.domain}</td>
                  <td className="mono">{c.allowedSenderEmails?.join(', ') || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(c);
                      }}
                      style={{ padding: '2px 8px', fontSize: 12 }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Edit Company Modal */}
      {editingCompany && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setEditingCompany(null)}
        >
          <div
            style={{
              background: 'var(--card-bg, #fff)',
              padding: 24,
              borderRadius: 8,
              width: 520,
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 16 }}>Edit {editingCompany.name}</h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start' }}>
                <div>
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>Company Name *</label>
                    <input
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>Domain *</label>
                    <input
                      required
                      value={editDomain}
                      onChange={(e) => setEditDomain(e.target.value)}
                    />
                  </div>

                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>Logo Image URL</label>
                    <input
                      placeholder="https://example.com/logo.png"
                      value={editLogo}
                      onChange={(e) => {
                        setEditLogo(e.target.value);
                        setEditLogoError(false);
                      }}
                    />
                  </div>
                </div>

                {/* Edit Modal Live Logo Preview */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    padding: 12,
                    background: 'var(--bg-subtle, #f8fafc)',
                    borderRadius: 8,
                    border: '1px dashed var(--border, #cbd5e1)',
                    textAlign: 'center',
                    marginTop: 20,
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
                    PREVIEW
                  </span>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      background: '#fff',
                      border: '1px solid var(--border, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {editLogo && !editLogoError ? (
                      <img
                        src={editLogo}
                        alt="Logo preview"
                        onError={() => setEditLogoError(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: 'var(--primary, #3b82f6)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {editName ? editName.charAt(0) : '?'}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
                    {editLogo && editLogoError ? 'Invalid URL' : editLogo ? 'Looks good!' : 'Initials'}
                  </span>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label>Allowed sender emails (comma-separated)</label>
                <input
                  value={editSenderEmails}
                  onChange={(e) => setEditSenderEmails(e.target.value)}
                  placeholder="alerts@acme.com, info@acme.com"
                />
              </div>

              {editError && <p style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>{editError}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  disabled={editSaving}
                  onClick={() => setEditingCompany(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
