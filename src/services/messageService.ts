import { apiClient } from './apiClient';

export type SentMailFlag = boolean | string | number | null | undefined;

export interface SentMailEntry {
  id: string;
  campaignId?: string;
  campaignName: string;
  recipient: string;
  recipientName?: string;
  sent: boolean;
  opened: boolean;
  delivered: boolean;
  clicked: boolean;
  sentAt?: string;
  openedAt?: string;
  deliveredAt?: string;
  clickedAt?: string;
  status?: string;
  raw?: unknown;
}

type RawSentMail = Record<string, unknown>;

type PaginatedSentMailPayload =
  | RawSentMail[]
  | {
      results?: RawSentMail[];
      data?: RawSentMail[];
      emails?: RawSentMail[];
      sent_mails?: RawSentMail[];
      count?: number;
      next?: string | null;
      previous?: string | null;
      total_pages?: number;
      totalPages?: number;
      page?: number;
      current_page?: number;
      currentPage?: number;
    };

function asString(value: unknown, fallback = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asBool(value: SentMailFlag): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (['true', '1', 'yes', 'y', 'sent', 'delivered', 'opened', 'clicked', 'success', 'successful'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'failed', 'undelivered', 'unopened', 'not clicked', 'not_clicked', 'none', 'null'].includes(normalized)) {
      return false;
    }
  }
  return Boolean(value);
}

function first(raw: RawSentMail, keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
}

function extractRows(payload: PaginatedSentMailPayload): RawSentMail[] {
  if (Array.isArray(payload)) return payload;
  return payload.results ?? payload.data ?? payload.emails ?? payload.sent_mails ?? [];
}

function getNextPage(payload: PaginatedSentMailPayload, page: number): number | null {
  if (Array.isArray(payload)) return null;
  if (payload.next) return page + 1;

  const totalPages = Number(payload.total_pages ?? payload.totalPages ?? NaN);
  if (Number.isFinite(totalPages) && page < totalPages) return page + 1;

  const currentPage = Number(payload.current_page ?? payload.currentPage ?? page);
  const count = Number(payload.count ?? NaN);
  const rows = extractRows(payload).length;
  if (Number.isFinite(count) && rows > 0 && currentPage * rows < count) return page + 1;

  return null;
}

function normalizeTimestamp(value: unknown): string | undefined {
  const text = asString(value).trim();
  return text || undefined;
}

function toSentMail(raw: RawSentMail, index: number): SentMailEntry {
  const sentValue = first(raw, ['sent', 'is_sent', 'sent_status', 'email_status', 'status']) as SentMailFlag;
  const deliveredValue = first(raw, ['delivered', 'is_delivered', 'delivery_status', 'delivered_status']) as SentMailFlag;
  const openedValue = first(raw, ['opened', 'is_opened', 'open_status', 'opened_status', 'open']) as SentMailFlag;
  const clickedValue = first(raw, ['clicked', 'is_clicked', 'click_status', 'clicked_status', 'click']) as SentMailFlag;

  const sentAt = normalizeTimestamp(first(raw, ['sent_at', 'sentAt', 'sent_date', 'sent_time', 'created_at', 'createdAt']));
  const deliveredAt = normalizeTimestamp(first(raw, ['delivered_at', 'deliveredAt', 'delivery_time']));
  const openedAt = normalizeTimestamp(first(raw, ['opened_at', 'openedAt', 'open_time']));
  const clickedAt = normalizeTimestamp(first(raw, ['clicked_at', 'clickedAt', 'click_time']));

  const campaign = first(raw, ['campaign']);
  const nestedCampaignId = campaign && typeof campaign === 'object'
    ? asString((campaign as Record<string, unknown>).id)
    : '';
  const nestedCampaignName = campaign && typeof campaign === 'object'
    ? asString(first(campaign as Record<string, unknown> ? campaign as Record<string, unknown> : {}, ['name', 'title', 'campaign_name']))
    : '';
  const campaignId = asString(first(raw, ['campaign_id', 'campaignId'])) || nestedCampaignId || undefined;

  return {
    id: asString(first(raw, ['id', 'email_id', 'message_id', 'pk']), `row-${index}`),
    campaignId,
    campaignName: asString(first(raw, ['campaign_name', 'campaignName', 'campaign_title', 'name']), nestedCampaignName || (campaignId ? `Campaign ${campaignId}` : '—')),
    recipient: asString(first(raw, ['recipient', 'email', 'to', 'recipient_email', 'to_email']), '—'),
    recipientName: asString(first(raw, ['recipient_name', 'recipientName', 'name', 'full_name', 'fullname', 'contact_name', 'contactName'])) || undefined,
    sent: sentAt ? true : asBool(sentValue),
    opened: openedAt ? true : asBool(openedValue),
    delivered: deliveredAt ? true : asBool(deliveredValue),
    clicked: clickedAt ? true : asBool(clickedValue),
    sentAt,
    openedAt,
    deliveredAt,
    clickedAt,
    status: asString(first(raw, ['status', 'email_status', 'delivery_status'])) || undefined,
    raw,
  };
}

export async function listSentMails(campaignId?: string): Promise<SentMailEntry[]> {
  const all: SentMailEntry[] = [];
  let page = 1;

  // The endpoint is paginated. Follow its pagination metadata so Message Log
  // and Campaign History show the full result set rather than only page one.
  while (page <= 200) {
    const params = new URLSearchParams({ page: String(page) });
    if (campaignId) params.set('campaign_id', campaignId);

    const payload = await apiClient.get<PaginatedSentMailPayload>(`/paginated-sent-mails/?${params.toString()}`);
    const rows = extractRows(payload);
    all.push(...rows.map((row, index) => toSentMail(row, all.length + index)));

    const next = getNextPage(payload, page);
    if (!next || rows.length === 0) break;
    page = next;
  }

  return all;
}

// Backwards-compatible names used by older code paths.
export type MessageLogEntry = SentMailEntry;
export async function listMessages(): Promise<SentMailEntry[]> {
  return listSentMails();
}
export async function getMessage(messageId: string): Promise<SentMailEntry | undefined> {
  const rows = await listSentMails();
  return rows.find((row) => row.id === messageId);
}
