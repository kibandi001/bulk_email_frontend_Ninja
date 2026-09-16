import { useEffect, useState } from 'react';
import { createCompany, listCompanies } from '../../services/companyService';
import type { Company } from '../../types';
import { Card } from '../../components/ui/Card';

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [senderEmails, setSenderEmails] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        allowedSenderEmails: senderEmails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean),
      });
      setCompanies((prev) => [...prev, created]);
      setName('');
      setDomain('');
      setSenderEmails('');
    } catch {
      setError('Could not create that company.');
    }
  }

  return (
    <div>
      <p className="section-intro">
        Companies own users and control which sender addresses their campaigns may send from.
      </p>

      <Card title="Add a company">
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="company-name">Name</label>
          <input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="company-domain">Domain</label>
          <input
            id="company-domain"
            placeholder="nca.ke"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="company-senders">Allowed sender emails (comma-separated)</label>
          <input
            id="company-senders"
            placeholder="alerts@nca.ke, news@nca.ke"
            value={senderEmails}
            onChange={(e) => setSenderEmails(e.target.value)}
          />
        </div>
        {error && <p className="login__error">{error}</p>}
        <button className="btn btn--primary" onClick={handleCreate}>
          Create company
        </button>
      </Card>

      <Card title="Companies" eyebrow={`${companies.length} total`}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Domain</th>
              <th>Allowed senders</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="mono">{c.domain}</td>
                <td className="mono">{c.allowedSenderEmails.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
