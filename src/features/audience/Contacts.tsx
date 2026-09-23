
import { useEffect, useState, useRef } from 'react';
import {
  listPaginatedSubscribers,
  listSubscriberGroups,
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  bulkDeleteSubscribers,
  unsubscribeSubscriber,
  uploadSubscriberCsv,
  downloadSubscribersCsv,
  listAllSubscribers,
  createSubscriberGroup,
  updateSubscriberGroup,
  deleteSubscriberGroup,
} from '../../services/subscriberService';
import type { Subscriber, SubscriberGroup } from '../../types/subscriber';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useSubscriberEvents } from '../../hooks/useSubscriberEvents';
import './Contacts.css';

export function Contacts() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');

  // ----------------------------------------------------
  // SUBSCRIBERS STATE
  // ----------------------------------------------------
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed' | 'blacklisted'>('all');
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Modals for Contacts
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);

  // Form fields for Add/Edit Contact
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formGroupId, setFormGroupId] = useState<number | undefined>();
  const [formIsSubscribed, setFormIsSubscribed] = useState(true);
  const [formIsBlacklisted, setFormIsBlacklisted] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  // CSV Import / Export
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // ----------------------------------------------------
  // GROUPS STATE
  // ----------------------------------------------------
  const [groups, setGroups] = useState<SubscriberGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SubscriberGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  // 1. Fetch Groups
  function loadGroups() {
    setGroupsLoading(true);
    listSubscriberGroups()
      .then(setGroups)
      .catch((err) => console.error('Failed to load groups:', err))
      .finally(() => setGroupsLoading(false));
  }

  useEffect(() => {
    loadGroups();
  }, []);

  // 2. Fetch Subscribers
  function loadSubscribers(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setLoading(true);
    const isSubscribed =
      statusFilter === 'subscribed' ? true : statusFilter === 'unsubscribed' ? false : undefined;
    const isBlacklisted = statusFilter === 'blacklisted' ? true : undefined;

    listPaginatedSubscribers({
      limit: PAGE_SIZE,
      offset,
      email: search || undefined,
      group_id: selectedGroupId || undefined,
      is_subscribed: isSubscribed,
      is_blacklisted: isBlacklisted,
    })
      .then((res) => {
        const items = Array.isArray(res) ? res : res?.results ?? (res as any)?.data ?? [];
        setSubscribers(items);
        setTotalCount(res?.count ?? items.length);
        if (opts.silent) {
          // Don't blow away the user's selection on a background refresh —
          // just drop any ids that no longer exist in the refreshed list.
          const stillPresent = new Set(items.map((i: Subscriber) => i.id));
          setSelectedIds((prev) => prev.filter((id) => stillPresent.has(id)));
        } else {
          setSelectedIds([]);
        }
      })
      .catch((err) => console.error('Failed to load subscribers:', err))
      .finally(() => {
        if (!opts.silent) setLoading(false);
      });
  }

  useEffect(() => {
    if (activeTab === 'contacts') {
      loadSubscribers();
    }
  }, [offset, selectedGroupId, statusFilter, activeTab]);

  // Live-updating list. There's no CONFIRMED WebSocket/push endpoint for
  // subscribers (see the ASSUMPTION note on SUBSCRIBERS_WS_URL) so this uses
  // both a socket and a polling fallback rather than betting on one:
  //  - useSubscriberEvents tries the socket and silently refetches on any
  //    recognised change event.
  //  - The interval below keeps polling as a safety net, but backs off to a
  //    slow 60s "just in case" cadence once the socket reports connected,
  //    and runs every 15s while the socket isn't (yet) available.
  // Both are paused while a modal is open (can't clobber an in-progress
  // add/edit) and off the Contacts tab.
  const socketEnabled = activeTab === 'contacts' && !showAddModal && !editingSubscriber;
  const { connected: socketConnected } = useSubscriberEvents({
    enabled: socketEnabled,
    onChange: () => loadSubscribers({ silent: true }),
  });

  const POLL_INTERVAL_MS = 15000;
  const POLL_FALLBACK_MS = 60000;
  useEffect(() => {
    if (!socketEnabled) return;

    const id = setInterval(
      () => {
        loadSubscribers({ silent: true });
      },
      socketConnected ? POLL_FALLBACK_MS : POLL_INTERVAL_MS
    );

    return () => clearInterval(id);
  }, [socketEnabled, socketConnected, offset, selectedGroupId, statusFilter, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    loadSubscribers();
  }

  // ----------------------------------------------------
  // CONTACT ACTIONS
  // ----------------------------------------------------
  function openAddContact() {
    setFormEmail('');
    setFormFirstName('');
    setFormLastName('');
    setFormGroupId(groups[0]?.id);
    setFormIsSubscribed(true);
    setFormIsBlacklisted(false);
    setContactError(null);
    setShowAddModal(true);
  }

  function openEditContact(sub: Subscriber) {
    setEditingSubscriber(sub);
    setFormEmail(sub.email);
    setFormFirstName(sub.first_name === 'nan' ? '' : sub.first_name);
    setFormLastName(sub.last_name === 'nan' ? '' : sub.last_name);
    setFormGroupId(sub.group_id ?? sub.groups?.[0]);
    setFormIsSubscribed(sub.is_subscribed);
    setFormIsBlacklisted(sub.is_blacklisted);
    setContactError(null);
  }

  async function handleSaveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!formEmail.trim()) return;
    setContactError(null);

    try {
      if (editingSubscriber) {
        await updateSubscriber(editingSubscriber.id, {
          first_name: formFirstName.trim(),
          last_name: formLastName.trim(),
          is_subscribed: formIsSubscribed,
          is_blacklisted: formIsBlacklisted,
          groups: formGroupId ? [formGroupId] : [],
        });
        setEditingSubscriber(null);
      } else {
        await createSubscriber({
          email: formEmail.trim(),
          first_name: formFirstName.trim(),
          last_name: formLastName.trim(),
          groups: formGroupId ? [formGroupId] : [],
          is_subscribed: formIsSubscribed,
          is_blacklisted: formIsBlacklisted,
        });
        setShowAddModal(false);
      }
      loadSubscribers();
      loadGroups();
    } catch {
      setContactError('Failed to save subscriber.');
    }
  }

  async function handleDeleteContact(id: number) {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await deleteSubscriber(id);
      loadSubscribers();
      loadGroups();
    } catch {
      alert('Failed to delete contact.');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected contact(s)?`)) return;

    try {
      await bulkDeleteSubscribers(selectedIds);
      setSelectedIds([]);
      loadSubscribers();
      loadGroups();
    } catch {
      alert('Failed to bulk delete contacts.');
    }
  }

  async function handleUnsubscribeContact(id: number) {
    if (!confirm('Unsubscribe this contact? They will stop receiving emails but stay in the list.')) return;
    try {
      await unsubscribeSubscriber(id);
      loadSubscribers();
    } catch {
      alert('Failed to unsubscribe contact.');
    }
  }

  async function handleBulkUnsubscribe() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Unsubscribe ${selectedIds.length} selected contact(s)?`)) return;

    try {
      await Promise.all(selectedIds.map((id) => unsubscribeSubscriber(id)));
      setSelectedIds([]);
      loadSubscribers();
    } catch {
      alert('Failed to unsubscribe one or more contacts.');
    }
  }

  // Exports every contact matching the current search/group/status filters,
  // not just the current page — there's no backend export endpoint, so this
  // pages through listPaginatedSubscribers client-side and builds the CSV.
  async function handleExportCsv() {
    setExporting(true);
    try {
      const isSubscribed =
        statusFilter === 'subscribed' ? true : statusFilter === 'unsubscribed' ? false : undefined;
      const isBlacklisted = statusFilter === 'blacklisted' ? true : undefined;

      const all = await listAllSubscribers({
        email: search || undefined,
        group_id: selectedGroupId || undefined,
        is_subscribed: isSubscribed,
        is_blacklisted: isBlacklisted,
      });
      downloadSubscribersCsv(all);
    } catch {
      alert('Failed to export contacts.');
    } finally {
      setExporting(false);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === subscribers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subscribers.map((s) => s.id));
    }
  }

  function toggleSelectRow(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetGroupId = selectedGroupId ? Number(selectedGroupId) : groups[0]?.id;
    if (!targetGroupId) {
      alert('Please select or create a group first to import into.');
      return;
    }

    setImportStatus('Uploading CSV...');
    try {
      await uploadSubscriberCsv(file, targetGroupId);
      setImportStatus('CSV imported successfully!');
      setTimeout(() => setImportStatus(null), 3000);
      loadSubscribers();
      loadGroups();
    } catch {
      setImportStatus('CSV import failed.');
      setTimeout(() => setImportStatus(null), 3000);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ----------------------------------------------------
  // GROUP ACTIONS
  // ----------------------------------------------------
  function openAddGroup() {
    setGroupName('');
    setGroupDescription('');
    setGroupError(null);
    setEditingGroup(null);
    setShowGroupModal(true);
  }

  function openEditGroup(g: SubscriberGroup) {
    setEditingGroup(g);
    setGroupName(g.name);
    setGroupDescription(g.description || '');
    setGroupError(null);
    setShowGroupModal(true);
  }

  async function handleSaveGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setGroupError(null);

    try {
      if (editingGroup) {
        await updateSubscriberGroup(editingGroup.id, {
          name: groupName.trim(),
          description: groupDescription.trim(),
        });
      } else {
        await createSubscriberGroup({
          name: groupName.trim(),
          description: groupDescription.trim(),
        });
      }
      setShowGroupModal(false);
      loadGroups();
    } catch {
      setGroupError('Failed to save group.');
    }
  }

  async function handleDeleteGroup(id: number) {
    if (!confirm('Are you sure you want to delete this subscriber group?')) return;
    try {
      await deleteSubscriberGroup(id);
      loadGroups();
      if (selectedGroupId === String(id)) setSelectedGroupId('');
    } catch {
      alert('Failed to delete group.');
    }
  }

  return (
    <div>
      <p className="section-intro">
        Manage your contact base, subscriber lists, and automated group memberships.
      </p>

      {/* Top Tab Bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${activeTab === 'contacts' ? 'btn--primary' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts ({totalCount.toLocaleString()})
        </button>
        <button
          className={`btn ${activeTab === 'groups' ? 'btn--primary' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Subscriber Groups ({groups.length})
        </button>
      </div>

      {/* Hidden File Input for CSV */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* ==================================================== */}
      {/* TAB 1: CONTACTS VIEW */}
      {/* ==================================================== */}
      {activeTab === 'contacts' && (
        <Card
          title={`All Contacts (${totalCount.toLocaleString()})`}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                title={
                  socketConnected
                    ? 'Live updates connected — new changes appear automatically'
                    : 'Live socket unavailable — refreshing periodically instead'
                }
                style={{ fontSize: 12, color: socketConnected ? '#1a7f37' : '#8a8a8a', marginRight: 4 }}
              >
                {socketConnected ? '● Live' : '○ Polling'}
              </span>
              {selectedIds.length > 0 && (
                <>
                  <button className="btn btn--sm" onClick={handleBulkUnsubscribe}>
                    Unsubscribe ({selectedIds.length})
                  </button>
                  <button className="btn btn--sm btn--danger" onClick={handleBulkDelete}>
                    Delete ({selectedIds.length})
                  </button>
                </>
              )}
              <button className="btn btn--primary" onClick={openAddContact}>
                + Add Contact
              </button>
              <button className="btn" onClick={() => fileInputRef.current?.click()}>
                Import CSV
              </button>
              <button className="btn" onClick={handleExportCsv} disabled={exporting}>
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          }
        >
          {importStatus && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 6 }}>
              {importStatus}
            </div>
          )}

          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: 220 }}>
              <input
                placeholder="Search by email (press Enter)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setOffset(0);
              }}
              style={{ minWidth: 180 }}
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.num_subscribers ?? 0})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setOffset(0);
              }}
              style={{ minWidth: 150 }}
            >
              <option value="all">All Statuses</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>

          {/* Contacts Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={subscribers.length > 0 && selectedIds.length === subscribers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>Email</th>
                <th>List / Group</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>
                    Loading contacts...
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No contacts match the criteria.
                  </td>
                </tr>
              ) : (
                subscribers.map((c) => {
                  const name =
                    [c.first_name, c.last_name]
                      .filter((n) => n && n !== 'nan')
                      .join(' ') || '—';
                  const status = c.is_blacklisted
                    ? 'bounced'
                    : c.is_subscribed
                      ? 'granted'
                      : 'unsubscribed';

                  return (
                    <tr key={`${c.id}-${c.group_id ?? 0}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleSelectRow(c.id)}
                        />
                      </td>
                      <td>{name}</td>
                      <td className="mono">{c.email}</td>
                      <td>{c.group_name || '—'}</td>
                      <td>
                        <StatusBadge status={status} />
                      </td>
                      <td className="mono">{c.created_at || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn--sm"
                            onClick={() => openEditContact(c)}
                            style={{ padding: '2px 8px', fontSize: 12 }}
                          >
                            Edit
                          </button>
                          {c.is_subscribed && (
                            <button
                              className="btn btn--sm"
                              onClick={() => handleUnsubscribeContact(c.id)}
                              style={{ padding: '2px 8px', fontSize: 12 }}
                            >
                              Unsubscribe
                            </button>
                          )}
                          <button
                            className="btn btn--sm btn--danger"
                            onClick={() => handleDeleteContact(c.id)}
                            style={{ padding: '2px 8px', fontSize: 12 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              Showing {subscribers.length > 0 ? offset + 1 : 0} to {Math.min(offset + PAGE_SIZE, totalCount)} of{' '}
              {totalCount.toLocaleString()}
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn--sm"
                disabled={offset === 0 || loading}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              >
                Previous
              </button>
              <button
                className="btn btn--sm"
                disabled={offset + PAGE_SIZE >= totalCount || loading}
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* ==================================================== */}
      {/* TAB 2: GROUPS VIEW */}
      {/* ==================================================== */}
      {activeTab === 'groups' && (
        <Card
          title={`Subscriber Groups (${groups.length})`}
          actions={
            <button className="btn btn--primary" onClick={openAddGroup}>
              + Create Group
            </button>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Group Name</th>
                <th>Description</th>
                <th>Subscribers</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupsLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>
                    Loading groups...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No subscriber groups created yet.
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <tr key={g.id}>
                    <td className="mono">{g.id}</td>
                    <td style={{ fontWeight: 600 }}>{g.name}</td>
                    <td>{g.description || '—'}</td>
                    <td className="mono">{g.num_subscribers?.toLocaleString() ?? 0}</td>
                    <td className="mono">{g.created_at || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn--sm"
                          onClick={() => openEditGroup(g)}
                          style={{ padding: '2px 8px', fontSize: 12 }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn--sm btn--danger"
                          onClick={() => handleDeleteGroup(g.id)}
                          style={{ padding: '2px 8px', fontSize: 12 }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT CONTACT */}
      {/* ==================================================== */}
      {(showAddModal || editingSubscriber) && (
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
        >
          <div style={{ background: 'var(--card-bg, #fff)', padding: 24, borderRadius: 8, width: 440 }}>
            <h3 style={{ marginTop: 0 }}>{editingSubscriber ? 'Edit Contact' : 'Add Contact'}</h3>
            <form onSubmit={handleSaveContact}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Email *</label>
                <input
                  type="email"
                  required
                  disabled={!!editingSubscriber}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="subscriber@example.com"
                />
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label>First Name</label>
                <input
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label>Last Name</label>
                <input
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label>Group</label>
                <select
                  value={formGroupId ?? ''}
                  onChange={(e) => setFormGroupId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Select a group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status toggles */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formIsSubscribed}
                    onChange={(e) => setFormIsSubscribed(e.target.checked)}
                  />
                  Subscribed
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formIsBlacklisted}
                    onChange={(e) => setFormIsBlacklisted(e.target.checked)}
                  />
                  Blacklisted
                </label>
              </div>

              {contactError && <p style={{ color: 'red', fontSize: 13 }}>{contactError}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSubscriber(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT GROUP */}
      {/* ==================================================== */}
      {showGroupModal && (
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
        >
          <div style={{ background: 'var(--card-bg, #fff)', padding: 24, borderRadius: 8, width: 440 }}>
            <h3 style={{ marginTop: 0 }}>{editingGroup ? 'Edit Group' : 'Create Subscriber Group'}</h3>
            <form onSubmit={handleSaveGroup}>
              <div className="field" style={{ marginBottom: 12 }}>
                <label>Group Name *</label>
                <input
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Newsletter Subscribers"
                />
              </div>

              <div className="field" style={{ marginBottom: 16 }}>
                <label>Description</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Describe this group..."
                  rows={3}
                />
              </div>

              {groupError && <p style={{ color: 'red', fontSize: 13 }}>{groupError}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn" onClick={() => setShowGroupModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  {editingGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
