import { useEffect, useMemo, useState } from 'react';
import { listSentMails, type SentMailEntry } from '../../services/messageService';
import { listCampaigns } from '../../services/campaignService';
import type { Campaign } from '../../types';
import * as XLSX from 'xlsx';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Card } from '../../components/ui/Card';

const FILTERS = ['sent', 'opened', 'delivered', 'clicked'] as const;
type FilterKey = (typeof FILTERS)[number];

function statusBadge(value: boolean, positive: string, negative: string) {
  return <StatusBadge status={value ? positive : negative.replaceAll(' ', '_')} />;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'message-export';
}

function buildExportData(rows: SentMailEntry[]) {
  return rows.map((mail) => ({
    Campaign: mail.campaignName,
    Name: mail.recipientName || '',
    Recipient: mail.recipient,
    Sent: mail.sent ? 'sent' : 'failed',
    Opened: mail.opened ? 'opened' : 'unopened',
    Delivered: mail.delivered ? 'delivered' : 'undelivered',
    Clicked: mail.clicked ? 'clicked' : 'not clicked',
    'Sent At': mail.sentAt || '',
    'Opened At': mail.openedAt || '',
    'Delivered At': mail.deliveredAt || '',
    'Clicked At': mail.clickedAt || '',
  }));
}

export function SentMailTable({
  campaignId,
  showCampaignColumn = true,
  title = 'Message events',
}: {
  campaignId?: string;
  showCampaignColumn?: boolean;
  title?: string;
}) {
  const [messages, setMessages] = useState<SentMailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSearchInput('');
    setAppliedSearch('');
    setActiveFilter(null);
    setFromDate('');
    setToDate('');

    listSentMails(campaignId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load sent emails.');
          setMessages([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return messages.filter((mail) => {
      const searchable = [mail.recipientName, mail.recipient, mail.campaignName]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      const matchesSearch = !q || searchable.some((value) => value.includes(q));
      if (!matchesSearch) return false;

      const sentTime = mail.sentAt ? new Date(mail.sentAt).getTime() : NaN;
      if (fromDate) {
        const from = new Date(`${fromDate}T00:00:00`).getTime();
        if (!Number.isNaN(from) && (Number.isNaN(sentTime) || sentTime < from)) return false;
      }
      if (toDate) {
        const to = new Date(`${toDate}T23:59:59.999`).getTime();
        if (!Number.isNaN(to) && (Number.isNaN(sentTime) || sentTime > to)) return false;
      }

      if (!activeFilter) return true;
      return mail[activeFilter];
    });
  }, [messages, appliedSearch, activeFilter, fromDate, toDate]);

  function applySearch() {
    setAppliedSearch(searchInput);
  }

  function clearFilters() {
    setSearchInput('');
    setAppliedSearch('');
    setActiveFilter(null);
    setFromDate('');
    setToDate('');
  }

  function exportRows(rows: SentMailEntry[], suffix: 'all' | 'filtered') {
    if (!rows.length || exporting) return;

    setExporting(true);
    try {
      const exportData = buildExportData(rows);
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Emails');
      const filename = `${slugify(title)}-${suffix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('Message export failed:', err);
      setError('Could not export the message list. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  function exportAll() {
    exportRows(messages, 'all');
  }

  function exportFiltered() {
    exportRows(filtered, 'filtered');
  }

  return (
    <Card title={title} className="message-log-card">
      <div className="message-log__filters">
        <div className="message-log__field">
          <label htmlFor={`${slugify(title)}-recipient`}>Name / Recipient</label>
          <input
            id={`${slugify(title)}-recipient`}
            placeholder="Search by name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
          />
        </div>

        <div className="message-log__field message-log__date-field">
          <label htmlFor={`${slugify(title)}-from-date`}>From date</label>
          <input
            id={`${slugify(title)}-from-date`}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="message-log__field message-log__date-field">
          <label htmlFor={`${slugify(title)}-to-date`}>To date</label>
          <input
            id={`${slugify(title)}-to-date`}
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div className="message-log__filter-pills" role="group" aria-label="Message status filters">
          {FILTERS.map((filter) => (
            <button
              type="button"
              key={filter}
              className={`message-log__pill ${activeFilter === filter ? 'message-log__pill--active' : ''}`}
              onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
            >
              {filter[0].toUpperCase() + filter.slice(1)}
            </button>
          ))}
          <button type="button" className="message-log__pill message-log__pill--search" onClick={applySearch}>
            Search
          </button>
          <button type="button" className="message-log__pill message-log__pill--clear" onClick={clearFilters}>
            Clear Filters
          </button>
          <button type="button" className="message-log__pill message-log__pill--export" onClick={exportAll} disabled={!messages.length || exporting}>
            {exporting ? 'Exporting…' : 'Export All'}
          </button>
          <button type="button" className="message-log__pill message-log__pill--export message-log__pill--export-filtered" onClick={exportFiltered} disabled={!filtered.length || exporting}>
            {exporting ? 'Exporting…' : `Export Filtered${filtered.length ? ` (${filtered.length})` : ''}`}
          </button>
        </div>
      </div>

      {error && <div className="message-log__error">{error}</div>}
      {loading ? (
        <div className="message-log__empty">Loading emails…</div>
      ) : (
        <div className="message-log__table-wrap">
          <table className="data-table message-log__table">
            <thead>
              <tr>
                {showCampaignColumn && <th>Campaign</th>}
                <th>Recipient</th>
                <th>Sent</th>
                <th>Opened</th>
                <th>Delivered</th>
                <th>Clicked</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mail) => (
                <tr key={`${mail.id}-${mail.recipient}`}>
                  {showCampaignColumn && <td>{mail.campaignName}</td>}
                  <td className="mono">{mail.recipient}</td>
                  <td>{statusBadge(mail.sent, 'sent', 'failed')}</td>
                  <td>{statusBadge(mail.opened, 'opened', 'unopened')}</td>
                  <td>{statusBadge(mail.delivered, 'delivered', 'undelivered')}</td>
                  <td>{statusBadge(mail.clicked, 'clicked', 'not_clicked')}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={showCampaignColumn ? 6 : 5} className="empty-state">
                    No emails match the current search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function Messages() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');

  useEffect(() => {
    listCampaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  return (
    <div className="message-log">
      <p className="section-intro">
        Live per-recipient delivery results from the TMail API. Use the campaign and status filters to narrow the message list.
      </p>

      <div className="message-log__campaign-filter">
        <label htmlFor="message-campaign">Campaign</label>
        <select id="message-campaign" value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)}>
          <option value="">All campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
          ))}
        </select>
      </div>

      <SentMailTable campaignId={selectedCampaign || undefined} showCampaignColumn title="Message Log" />
    </div>
  );
}
