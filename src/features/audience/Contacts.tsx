import { useEffect, useState } from 'react';
import { listContacts } from '../../services/contactService';
import type { Contact } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    listContacts().then(setContacts);
  }, []);

  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <p className="section-intro">
        Search, segment and export the contact base. Import adds records to a nominated list
        without disturbing consent status already on file.
      </p>
      <Card
        title={`Contacts (${contacts.length.toLocaleString()})`}
        actions={
          <>
            <button className="btn">Import from file</button>
            <button className="btn">Export CSV</button>
          </>
        }
      >
        <div className="field" style={{ marginBottom: 16 }}>
          <input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Lists</th>
              <th>Consent</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="mono">{c.email}</td>
                <td>{c.lists.join(', ')}</td>
                <td><StatusBadge status={c.consent} /></td>
                <td className="mono">{c.lastActivity}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">No contacts match "{query}".</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
