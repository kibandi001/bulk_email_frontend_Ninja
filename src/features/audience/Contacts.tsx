import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteContact,
  importSubscribers,
  listContacts,
  listGroups,
  parseSubscriberFile,
  updateContactGroups,
} from '../../services/contactService';
import type { Contact, ContactImportResult } from '../../types';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './Contacts.css';

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedConsent, setSelectedConsent] = useState<string>('all');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedRows, setParsedRows] = useState<Array<{ email: string; name?: string; groups?: string[] }>>([]);
  const [selectedTargetGroups, setSelectedTargetGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick edit groups state
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingGroups, setEditingGroups] = useState<string[]>([]);
  const [addInlineGroupInput, setAddInlineGroupInput] = useState('');

  function loadData() {
    listContacts().then((loaded) => {
      setContacts(loaded);
    });
    listGroups().then((groups) => {
      setAvailableGroups(groups);
    });
  }

  useEffect(() => {
    loadData();
  }, []);

  // Compute group counts for quick filter pills
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contacts.length };
    availableGroups.forEach((g) => {
      const lower = g.toLowerCase();
      counts[g] = contacts.filter((c) => c.lists.some((l) => l.toLowerCase() === lower)).length;
    });
    return counts;
  }, [contacts, availableGroups]);

  // Filtered contacts
  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      // Search query (matches name, email, or groups)
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchGroup = c.lists.some((l) => l.toLowerCase().includes(q));
        if (!matchName && !matchEmail && !matchGroup) return false;
      }

      // Group filter
      if (selectedGroup !== 'all') {
        const target = selectedGroup.toLowerCase();
        if (!c.lists.some((l) => l.toLowerCase() === target)) {
          return false;
        }
      }

      // Consent filter
      if (selectedConsent !== 'all') {
        if (c.consent !== selectedConsent) return false;
      }

      return true;
    });
  }, [contacts, query, selectedGroup, selectedConsent]);

  // Handle file selection in Upload Modal
  async function handleFileSelected(file: File) {
    setSelectedFile(file);
    setIsParsing(true);
    try {
      const parsed = await parseSubscriberFile(file);
      setParsedRows(parsed);
    } catch {
      alert('Could not parse the file. Please ensure it is a valid CSV or Excel file (.xlsx, .xls).');
      setSelectedFile(null);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  }

  // Handle Upload Submission
  async function handleCompleteImport() {
    if (!selectedFile || parsedRows.length === 0) return;

    setIsImporting(true);
    try {
      const result: ContactImportResult = await importSubscribers(
        parsedRows,
        selectedTargetGroups
      );

      setUploadFeedback(
        `Import completed: ${result.imported} new subscribers added, ${result.updated} existing subscribers updated with new groups (${result.duplicates} duplicate rows skipped, ${result.invalid} invalid rows).`
      );

      // Close modal and refresh
      setShowUploadModal(false);
      setSelectedFile(null);
      setParsedRows([]);
      setSelectedTargetGroups([]);
      setNewGroupName('');
      loadData();
    } catch {
      alert('An error occurred during import. Please try again.');
    } finally {
      setIsImporting(false);
    }
  }

  function toggleTargetGroup(groupName: string) {
    setSelectedTargetGroups((prev) =>
      prev.includes(groupName) ? prev.filter((g) => g !== groupName) : [...prev, groupName]
    );
  }

  function handleAddNewGroup() {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    if (!availableGroups.includes(trimmed)) {
      setAvailableGroups((prev) => [...prev, trimmed]);
    }
    if (!selectedTargetGroups.includes(trimmed)) {
      setSelectedTargetGroups((prev) => [...prev, trimmed]);
    }
    setNewGroupName('');
  }

  // Download Sample CSV template
  function downloadSampleCsv() {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent(
        'email,name,groups\n' +
          'john.doe@example.com,John Doe,"Contractors, Western Region"\n' +
          'sarah.mwangi@example.ke,Sarah Mwangi,Vendors\n' +
          'compliance.officer@nca.go.ke,Compliance Office,Employees\n' +
          'licensing.applicant@domain.ke,Applicant Name,Licensing\n'
      );
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'sample_subscribers.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export current filtered contacts as CSV
  function handleExportCsv() {
    if (filtered.length === 0) {
      alert('No contacts to export.');
      return;
    }
    const headers = ['Name', 'Email', 'Groups', 'Consent', 'Last Activity'];
    const rows = filtered.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.email.replace(/"/g, '""')}"`,
      `"${c.lists.join('; ').replace(/"/g, '""')}"`,
      c.consent,
      c.lastActivity,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      encodeURIComponent([headers.join(','), ...rows.map((r) => r.join(','))].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `nca_subscribers_${selectedGroup}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Quick Inline Group Editing
  function startEditingGroups(contact: Contact) {
    setEditingContactId(contact.id);
    setEditingGroups([...contact.lists]);
    setAddInlineGroupInput('');
  }

  async function saveInlineGroups(contactId: string) {
    try {
      await updateContactGroups(contactId, editingGroups);
      setEditingContactId(null);
      loadData();
    } catch {
      alert('Could not update groups.');
    }
  }

  function removeInlineGroup(group: string) {
    setEditingGroups((prev) => prev.filter((g) => g !== group));
  }

  function addInlineGroup() {
    const trimmed = addInlineGroupInput.trim();
    if (!trimmed) return;
    if (!editingGroups.includes(trimmed)) {
      setEditingGroups((prev) => [...prev, trimmed]);
    }
    if (!availableGroups.includes(trimmed)) {
      setAvailableGroups((prev) => [...prev, trimmed]);
    }
    setAddInlineGroupInput('');
  }

  async function handleDeleteContact(contactId: string) {
    if (confirm('Are you sure you want to remove this subscriber?')) {
      await deleteContact(contactId);
      loadData();
    }
  }

  function clearFilters() {
    setQuery('');
    setSelectedGroup('all');
    setSelectedConsent('all');
  }

  const hasActiveFilters = query.trim() !== '' || selectedGroup !== 'all' || selectedConsent !== 'all';

  // Statistics for the uploaded file preview
  const uploadStats = useMemo(() => {
    if (!parsedRows || parsedRows.length === 0) return { total: 0, newCount: 0, existingCount: 0 };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRows = parsedRows.filter((r) => emailRegex.test(r.email.trim()));
    const existingEmails = new Set(contacts.map((c) => c.email.toLowerCase().trim()));

    let newCount = 0;
    let existingCount = 0;
    const seen = new Set<string>();

    validRows.forEach((r) => {
      const e = r.email.toLowerCase().trim();
      if (!seen.has(e)) {
        seen.add(e);
        if (existingEmails.has(e)) {
          existingCount++;
        } else {
          newCount++;
        }
      }
    });

    return { total: seen.size, newCount, existingCount };
  }, [parsedRows, contacts]);

  return (
    <div>
      <p className="section-intro">
        Search, segment and export the subscriber directory. Upload subscribers from CSV or Excel
        into single or multiple groups — subscribers can belong to multiple groups simultaneously.
      </p>

      {uploadFeedback && (
        <div className="contacts__alert">
          <span>✓ {uploadFeedback}</span>
          <button
            type="button"
            className="contacts__alert-close"
            onClick={() => setUploadFeedback(null)}
          >
            ×
          </button>
        </div>
      )}

      <Card
        title={`Subscribers (${filtered.length.toLocaleString()}${
          filtered.length !== contacts.length ? ` of ${contacts.length.toLocaleString()}` : ''
        })`}
        actions={
          <>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setShowUploadModal(true);
                setSelectedFile(null);
                setParsedRows([]);
              }}
            >
              ⬆ Upload Subscribers
            </button>
            <button type="button" className="btn" onClick={handleExportCsv}>
              Export CSV
            </button>
          </>
        }
      >
        <div className="contacts__toolbar">
          {/* Search input */}
          <div className="contacts__search-row">
            <input
              className="contacts__search-input"
              placeholder="Search subscribers by name, email, or group…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {hasActiveFilters && (
              <button
                type="button"
                className="campaign-studio__clear-btn"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Group pills with counts for quick 1-click filtering */}
          <div className="contacts__group-pills">
            <button
              type="button"
              className={`contacts__group-pill ${selectedGroup === 'all' ? 'contacts__group-pill--active' : ''}`}
              onClick={() => setSelectedGroup('all')}
            >
              <span>All Subscribers</span>
              <span className="contacts__group-pill-badge">{groupCounts['all'] || 0}</span>
            </button>
            {availableGroups.map((g) => (
              <button
                key={g}
                type="button"
                className={`contacts__group-pill ${selectedGroup === g ? 'contacts__group-pill--active' : ''}`}
                onClick={() => setSelectedGroup(g)}
              >
                <span>👥 {g}</span>
                <span className="contacts__group-pill-badge">{groupCounts[g] || 0}</span>
              </button>
            ))}
          </div>

          {/* Secondary filter dropdowns */}
          <div className="contacts__filter-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label htmlFor="group-select" style={{ fontSize: 12, color: 'var(--muted)' }}>
                Filter by Group:
              </label>
              <select
                id="group-select"
                className="contacts__filter-select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
              >
                <option value="all">All Groups</option>
                {availableGroups.map((g) => (
                  <option key={g} value={g}>
                    {g} ({groupCounts[g] || 0})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label htmlFor="consent-select" style={{ fontSize: 12, color: 'var(--muted)' }}>
                Consent:
              </label>
              <select
                id="consent-select"
                className="contacts__filter-select"
                value={selectedConsent}
                onChange={(e) => setSelectedConsent(e.target.value)}
              >
                <option value="all">All Consents</option>
                <option value="granted">Granted</option>
                <option value="pending">Pending</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Assigned Groups</th>
                <th>Consent</th>
                <th>Last activity</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="mono">{c.email}</td>
                  <td>
                    {editingContactId === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {editingGroups.map((g) => (
                            <span key={g} className="contacts__group-chip">
                              {g}
                              <span
                                className="contacts__group-chip-remove"
                                onClick={() => removeInlineGroup(g)}
                                title="Remove group"
                              >
                                ×
                              </span>
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            style={{ fontSize: 11, padding: '3px 6px', width: 130 }}
                            placeholder="Add group name…"
                            value={addInlineGroupInput}
                            onChange={(e) => setAddInlineGroupInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addInlineGroup();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                            onClick={addInlineGroup}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="btn btn--primary"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => saveInlineGroups(c.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                            onClick={() => setEditingContactId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                        {c.lists.map((g) => (
                          <span
                            key={g}
                            className="contacts__group-chip"
                            onClick={() => setSelectedGroup(g)}
                            style={{ cursor: 'pointer' }}
                            title={`Filter by ${g}`}
                          >
                            👥 {g}
                          </span>
                        ))}
                        <button
                          type="button"
                          className="contacts__add-group-btn"
                          onClick={() => startEditingGroups(c)}
                          title="Edit groups for this subscriber"
                        >
                          + Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={c.consent} />
                  </td>
                  <td className="mono">{c.lastActivity}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '3px 7px', fontSize: 11, color: 'var(--alert)' }}
                      onClick={() => handleDeleteContact(c.id)}
                      title="Delete contact"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    {hasActiveFilters ? (
                      <>
                        No subscribers match your search/filters.{' '}
                        <button
                          type="button"
                          onClick={clearFilters}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--blueprint)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Reset filters
                        </button>
                      </>
                    ) : (
                      'No contacts found in this list.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Subscribers Modal (CSV & Excel) */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Subscribers from CSV or Excel</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>
              Upload a spreadsheet (<strong>.csv</strong>, <strong>.xlsx</strong>, or <strong>.xls</strong>)
              containing subscriber emails. Assign them to one or more groups. If an email already
              exists, it will be added to the new groups without losing previous memberships.
            </p>

            {/* Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />

            <div
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileSelected(file);
              }}
            >
              <div className="dropzone__icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="dropzone__title">
                {selectedFile ? selectedFile.name : 'Choose a CSV or Excel file or drag & drop here'}
              </div>
              <div className="dropzone__sub">
                Supports .csv, .xlsx, .xls • Accepts columns for email, name, and groups
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <button
                type="button"
                onClick={downloadSampleCsv}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--blueprint)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                ⬇ Download sample CSV template
              </button>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setParsedRows([]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--alert)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Remove file
                </button>
              )}
            </div>

            {/* Target Group Assignment */}
            <div className="group-selection-box">
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>
                Assign to Groups:
              </label>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                Select existing groups or create a new one for this upload:
              </span>

              <div className="group-checklist">
                {availableGroups.map((group) => {
                  const isChecked = selectedTargetGroups.includes(group);
                  return (
                    <label
                      key={group}
                      className={`group-checkbox-pill ${isChecked ? 'group-checkbox-pill--checked' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTargetGroup(group)}
                      />
                      <span>👥 {group}</span>
                    </label>
                  );
                })}
              </div>

              {/* Create new group */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  placeholder="Create new group name…"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{ fontSize: 12, padding: '5px 8px', flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewGroup();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  style={{ fontSize: 12, padding: '5px 10px' }}
                  onClick={handleAddNewGroup}
                >
                  + Add Group
                </button>
              </div>
            </div>

            {/* Parsing & File Preview */}
            {isParsing && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 13 }}>
                Analyzing file rows…
              </div>
            )}

            {selectedFile && !isParsing && parsedRows.length > 0 && (
              <div>
                <div className="upload-preview-summary">
                  <div>
                    <div className="upload-preview-stat__val">{uploadStats.total}</div>
                    <div className="upload-preview-stat__lbl">Valid Emails</div>
                  </div>
                  <div>
                    <div className="upload-preview-stat__val" style={{ color: 'var(--verified)' }}>
                      +{uploadStats.newCount}
                    </div>
                    <div className="upload-preview-stat__lbl">New Subscribers</div>
                  </div>
                  <div>
                    <div className="upload-preview-stat__val" style={{ color: 'var(--blueprint)' }}>
                      {uploadStats.existingCount}
                    </div>
                    <div className="upload-preview-stat__lbl">Groups Merged</div>
                  </div>
                </div>

                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                  Preview of detected records:
                </label>
                <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 4, marginTop: 4 }}>
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>File Groups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td className="mono">{r.email}</td>
                          <td>{r.name || '—'}</td>
                          <td>{r.groups?.join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedFile && !isParsing && parsedRows.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--alert)', fontSize: 13 }}>
                No valid email rows detected in this file. Check header names or formatting.
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!selectedFile || parsedRows.length === 0 || isImporting}
                onClick={handleCompleteImport}
              >
                {isImporting
                  ? 'Importing…'
                  : `Complete Import (${uploadStats.total} subscribers)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
