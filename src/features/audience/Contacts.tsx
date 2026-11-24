/** @jsxRuntime classic */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { JSX as ReactJSX } from 'react';
import { createPortal } from 'react-dom';
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
import { useSubscriberEvents, type UploadEvent } from '../../hooks/useSubscriberEvents';
import './Contacts.css';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

const POLL_INTERVAL_MS = 15000;
const POLL_FALLBACK_MS = 60000;

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  boxSizing: 'border-box',
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  width: 'min(480px, 94vw)',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '24px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08)',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  margin: 'auto',
};

export function Contacts() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups'>('contacts');

  // ----------------------------------------------------
  // SUBSCRIBERS STATE
  // ----------------------------------------------------
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [search, setSearch] = useState(''); // what the user is typing
  const [appliedSearch, setAppliedSearch] = useState(''); // what was actually submitted
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed' | 'blacklisted'>('all');
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState<number>(15);

  // Used to ignore out-of-order responses
  const requestIdRef = useRef(0);

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

  const effectiveTotal = Math.max(totalCount, subscribers.length);
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / (pageSize || 15)));
  const currentPage = Math.min(totalPages, Math.floor(offset / (pageSize || 15)) + 1);

  // Slices to pageSize if backend returns an unpaginated array, otherwise keeps the paginated list
  const visibleSubscribers = useMemo(() => {
    return subscribers.length > pageSize
      ? subscribers.slice(offset, offset + pageSize)
      : subscribers;
  }, [subscribers, offset, pageSize]);

  // ----------------------------------------------------
  // DATA LOADING
  // ----------------------------------------------------
  function loadGroups(opts: { silent?: boolean } = {}) {
    if (!opts.silent) setGroupsLoading(true);
    listSubscriberGroups()
      .then(setGroups)
      .catch((err) => console.error('Failed to load groups:', err))
      .finally(() => {
        if (!opts.silent) setGroupsLoading(false);
      });
  }

  useEffect(() => {
    loadGroups();
  }, []);

  function loadSubscribers(opts: { silent?: boolean } = {}) {
    const requestId = ++requestIdRef.current;
    if (!opts.silent) setLoading(true);

    const isSubscribed =
      statusFilter === 'subscribed' ? true : statusFilter === 'unsubscribed' ? false : undefined;
    const isBlacklisted = statusFilter === 'blacklisted' ? true : undefined;

    listPaginatedSubscribers({
      limit: pageSize,
      offset,
      email: appliedSearch || undefined,
      group_id: selectedGroupId || undefined,
      is_subscribed: isSubscribed,
      is_blacklisted: isBlacklisted,
    })
      .then((res: any) => {
        if (requestId !== requestIdRef.current) return; // stale response

        let rawList: Subscriber[] = [];
        let totalCountNum: number | undefined;

        if (Array.isArray(res)) {
          rawList = res;
          totalCountNum = res.length;
        } else if (res && typeof res === 'object') {
          if (Array.isArray(res.results)) {
            rawList = res.results;
          } else if (Array.isArray(res.data)) {
            rawList = res.data;
          } else if (res.data && Array.isArray(res.data.results)) {
            rawList = res.data.results;
          }

          totalCountNum =
            res.count ??
            res.total ??
            res.total_count ??
            (res.data && typeof res.data.count === 'number' ? res.data.count : undefined) ??
            (res.data && typeof res.data.total === 'number' ? res.data.total : undefined);
        }

        setSubscribers(rawList);

        const calculatedTotal =
          typeof totalCountNum === 'number' && !isNaN(totalCountNum)
            ? totalCountNum
            : rawList.length >= pageSize
            ? offset + rawList.length + 1
            : offset + rawList.length;

        setTotalCount(calculatedTotal);

        if (opts.silent) {
          const stillPresent = new Set(rawList.map((i: Subscriber) => i.id));
          setSelectedIds((prev) => prev.filter((id) => stillPresent.has(id)));
        } else {
          setSelectedIds([]);
        }
      })
      .catch((err) => console.error('Failed to load subscribers:', err))
      .finally(() => {
        if (!opts.silent && requestId === requestIdRef.current) setLoading(false);
      });
  }

  useEffect(() => {
    if (activeTab === 'contacts') {
      loadSubscribers();
    }
  }, [offset, selectedGroupId, statusFilter, appliedSearch, activeTab, pageSize]);

  // ----------------------------------------------------
  // LIVE UPDATES
  // ----------------------------------------------------
  const socketEnabled = activeTab === 'contacts' && !showAddModal && !editingSubscriber;

  // Always call the latest loaders to avoid stale closures inside the hook
  const refreshRef = useRef<() => void>(() => {});
  refreshRef.current = () => {
    loadSubscribers({ silent: true });
    loadGroups({ silent: true });
  };

  // NOTE: option and return names are assumed; match them to your hook's real signature.
  const { connected: socketConnected, upload } = useSubscriberEvents({
    enabled: socketEnabled,
    onEvent: () => refreshRef.current(),
    pollIntervalMs: POLL_INTERVAL_MS,
    fallbackPollMs: POLL_FALLBACK_MS,
  }) as { connected: boolean; upload: UploadEvent | null };

  // ----------------------------------------------------
  // FILTER ACTIONS
  // ----------------------------------------------------
  function handleSearchSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setOffset(0);
    setAppliedSearch(search.trim());
  }

  function handleClearSearch() {
    setSearch('');
    setOffset(0);
    setAppliedSearch('');
  }

  function handleResetFilters() {
    setSearch('');
    setAppliedSearch('');
    setSelectedGroupId('');
    setStatusFilter('all');
    setOffset(0);
  }

  const hasActiveFilters = Boolean(appliedSearch || selectedGroupId || statusFilter !== 'all');

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
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : 'Failed to save subscriber.');
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

  async function handleExportCsv() {
    setExporting(true);
    try {
      const isSubscribed =
        statusFilter === 'subscribed' ? true : statusFilter === 'unsubscribed' ? false : undefined;
      const isBlacklisted = statusFilter === 'blacklisted' ? true : undefined;

      const all = await listAllSubscribers({
        email: appliedSearch || undefined,
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
    if (visibleSubscribers.length > 0 && selectedIds.length === visibleSubscribers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleSubscribers.map((s) => s.id));
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
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    } catch (err: unknown) {
      setGroupError(err instanceof Error ? err.message : 'Failed to save group.');
    }
  }

  async function handleDeleteGroup(id: number) {
    if (!confirm('Are you sure you want to delete this subscriber group?')) return;
    try {
      await deleteSubscriberGroup(id);
      if (selectedGroupId === String(id)) {
        setSelectedGroupId(''); // effect refetches contacts
      } else {
        loadSubscribers();
      }
      loadGroups();
    } catch {
      alert('Failed to delete group.');
    }
  }

  function resolveGroupName(sub: Subscriber): string {
    if (sub.group_name) return sub.group_name;
    if ((sub as any).list_name) return (sub as any).list_name;

    if (sub.group_id) {
      const match = groups.find((g) => g.id === sub.group_id);
      if (match) return match.name;
    }

    if (Array.isArray(sub.groups) && sub.groups.length > 0) {
      const matchedNames = sub.groups
        .map((item: any) => {
          if (typeof item === 'object' && item?.name) return item.name;
          const found = groups.find((g) => g.id === Number(item));
          return found ? found.name : null;
        })
        .filter(Boolean);

      if (matchedNames.length > 0) {
        return matchedNames.join(', ');
      }
    }

    return '—';
  }

  function closeContactModal() {
    setShowAddModal(false);
    setEditingSubscriber(null);
  }

  return (
    <div className="contacts-container">
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

          {upload && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 6 }}>
              {upload.type === 'subscriber.upload.completed'
                ? `Upload finished: ${upload.created} added, ${upload.failed} failed`
                : upload.type === 'subscriber.upload.failed'
                ? `Upload failed: ${upload.error ?? 'unknown error'}`
                : `Importing... ${upload.processed ?? 0} / ${upload.total ?? '?'}`}
              {upload.total ? (
                <progress value={upload.processed ?? 0} max={upload.total} style={{ width: '100%', marginTop: 6 }} />
              ) : null}
            </div>
          )}

          {/* Filters Bar */}
          <div className="contacts__filter-bar">
            <div className="contacts__filter-left">
              {/* Search by Email */}
              <form onSubmit={handleSearchSubmit} className="contacts__search-form">
                <div className="contacts__search-wrap">
                  <svg
                    className="contacts__search-icon"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="contacts__search-input"
                    placeholder="Search by email…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      className="contacts__search-clear"
                      onClick={handleClearSearch}
                      title="Clear email search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ height: 36, padding: '0 14px', whiteSpace: 'nowrap' }}
                >
                  Search
                </button>
              </form>

              {/* Group Selector */}
              <div className="contacts__select-wrap">
                <svg
                  className="contacts__select-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <select
                  className="contacts__select"
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setOffset(0);
                  }}
                  style={{ minWidth: 180 }}
                  aria-label="Filter by group"
                >
                  <option value="">All Groups ({groups.length})</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.num_subscribers ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Selector */}
              <div className="contacts__select-wrap">
                <svg
                  className="contacts__select-icon"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <select
                  className="contacts__select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setOffset(0);
                  }}
                  style={{ minWidth: 155 }}
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="blacklisted">Blacklisted</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="contacts__reset-btn"
                onClick={handleResetFilters}
                title="Reset all search and status filters"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
                Reset filters
              </button>
            )}
          </div>

          {/* Contacts Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={visibleSubscribers.length > 0 && selectedIds.length === visibleSubscribers.length}
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
                ) : visibleSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No contacts match the criteria.
                    </td>
                  </tr>
                ) : (
                  visibleSubscribers.map((c) => {
                    const name =
                      [c.first_name, c.last_name].filter((n) => n && n !== 'nan').join(' ') || '—';
                    const status = c.is_blacklisted
                      ? 'bounced'
                      : c.is_subscribed
                      ? 'subscribed'
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
                        <td>{resolveGroupName(c)}</td>
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
          </div>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid var(--border)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Showing {effectiveTotal > 0 ? offset + 1 : 0} to{' '}
                {Math.min(offset + (pageSize || 15), effectiveTotal)} of {effectiveTotal.toLocaleString()} contacts
              </span>

              {/* Rows per page selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setOffset(0);
                  }}
                  style={{
                    height: 28,
                    padding: '2px 8px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg, #fff)',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                  }}
                  aria-label="Contacts per page"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={1000}>All</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn--sm"
                disabled={offset === 0 || loading}
                onClick={() => setOffset((prev) => Math.max(0, prev - (pageSize || 15)))}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                Previous
              </button>

              {/* Page Number Pills */}
              {totalPages > 1 &&
                getPageNumbers(currentPage, totalPages).map((p, idx) =>
                  p === '...' ? (
                    <span key={`dots-${idx}`} style={{ padding: '0 4px', color: 'var(--muted)', fontSize: 12 }}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      className={`btn btn--sm ${p === currentPage ? 'btn--primary' : ''}`}
                      onClick={() => setOffset(((p as number) - 1) * (pageSize || 15))}
                      disabled={loading}
                      style={{
                        padding: '2px 8px',
                        fontSize: 12,
                        minWidth: 28,
                        fontWeight: p === currentPage ? 600 : 400,
                      }}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                className="btn btn--sm"
                disabled={offset + (pageSize || 15) >= effectiveTotal || loading}
                onClick={() => setOffset((prev) => prev + (pageSize || 15))}
                style={{ padding: '4px 10px', fontSize: 12 }}
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
          <div className="table-responsive">
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
          </div>
        </Card>
      )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT CONTACT */}
      {/* ==================================================== */}
      {(showAddModal || editingSubscriber) &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="modal-overlay" style={modalOverlayStyle}>
            <div className="modal-content" style={modalContentStyle}>
              <div className="modal-header">
                <h3 className="modal-title">{editingSubscriber ? 'Edit Contact' : 'Add Contact'}</h3>
                <button className="modal-close" onClick={closeContactModal}>
                  ×
                </button>
              </div>

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

                <div className="modal-actions">
                  <button type="button" className="btn" onClick={closeContactModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ==================================================== */}
      {/* MODAL: ADD / EDIT GROUP */}
      {/* ==================================================== */}
      {showGroupModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="modal-overlay" style={modalOverlayStyle}>
            <div className="modal-content" style={modalContentStyle}>
              <div className="modal-header">
                <h3 className="modal-title">{editingGroup ? 'Edit Group' : 'Create Subscriber Group'}</h3>
                <button className="modal-close" onClick={() => setShowGroupModal(false)}>
                  ×
                </button>
              </div>

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

                <div className="modal-actions">
                  <button type="button" className="btn" onClick={() => setShowGroupModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn--primary">
                    {editingGroup ? 'Save Changes' : 'Create Group'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}