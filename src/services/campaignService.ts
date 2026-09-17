

import { apiClient } from './apiClient';
import type { Campaign, CampaignDraft } from '../types';

interface RawCampaign {
  id: string | number;
  name?: string;
  title?: string;
  subject?: string;
  campaign_subject?: string | null;
  campaign_name?: string | null;
  body?: string;
  html?: string;
  from_email?: string | null;
  fromEmail?: string | null;
  sender?: string | null;
  template?: string | number | null;
  status?: string | null;
  is_active?: boolean;
  recipients?: number | string | null;
  recipient_count?: number | string | null;
  target_group?: string | null;
  targetGroup?: string | null;
  list_name?: string | null;
  list?: string | null;
  scheduled_for?: string | null;
  scheduledFor?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  schedule_type?: string | null;
  recurrence?: string | null;
  frequency?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  sent_at?: string | null;
  sentAt?: string | null;
  open_rate?: number | string | null;
  openRate?: number | string | null;
  click_rate?: number | string | null;
  clickRate?: number | string | null;
  bounce_rate?: number | string | null;
  bounceRate?: number | string | null;
  email_status?: string | null;
  emailStatus?: string | null;
  delivery_status?: string | null;
  deliveryStatus?: string | null;
}

type CampaignEnvelope = { results?: RawCampaign[]; data?: RawCampaign[]; campaign?: RawCampaign };
type CampaignResponse = RawCampaign[] | CampaignEnvelope;
type SingleCampaignResponse = RawCampaign | CampaignEnvelope;

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return numberValue(value);
}

function normalizeStatus(value: unknown): Campaign['status'] {
  const status = String(value ?? 'draft').trim().toLowerCase();
  if (['queued', 'processing', 'dispatching', 'in_progress'].includes(status)) return 'sending';
  if (['completed', 'complete', 'delivered', 'success'].includes(status)) return 'sent';
  if (['cancelled', 'canceled', 'inactive'].includes(status)) return 'paused';
  if (['draft', 'scheduled', 'sending', 'sent', 'paused'].includes(status)) return status as Campaign['status'];
  return 'draft';
}

function toCampaign(raw: RawCampaign): Campaign {
  return {
    id: String(raw.id),
    name: (raw.name ?? raw.title ?? raw.campaign_name ?? '').trim() || `Campaign ${raw.id}`,
    subject: (raw.subject ?? raw.campaign_subject ?? '').trim(),
    status: normalizeStatus(raw.status),
    recipients: numberValue(raw.recipients ?? raw.recipient_count),
    targetGroup: raw.targetGroup ?? raw.target_group ?? raw.list_name ?? raw.list ?? undefined,
    scheduledFor: raw.scheduledFor ?? raw.scheduled_for ?? undefined,
    createdAt: raw.createdAt ?? raw.created_at ?? undefined,
    sentAt: raw.sentAt ?? raw.sent_at ?? undefined,
    openRate: optionalNumber(raw.openRate ?? raw.open_rate),
    clickRate: optionalNumber(raw.clickRate ?? raw.click_rate),
    bounceRate: optionalNumber(raw.bounceRate ?? raw.bounce_rate),
    emailStatus: raw.emailStatus ?? raw.email_status ?? undefined,
    deliveryStatus: raw.deliveryStatus ?? raw.delivery_status ?? undefined,
    body: raw.body ?? raw.html ?? undefined,
    fromEmail: raw.fromEmail ?? raw.from_email ?? undefined,
    sender: raw.sender ?? undefined,
    template: raw.template == null ? undefined : String(raw.template),
  };
}

function extractCampaigns(payload: CampaignResponse): Campaign[] {
  if (Array.isArray(payload)) return payload.map(toCampaign);
  return (payload.results ?? payload.data ?? []).map(toCampaign);
}

function extractCampaign(payload: SingleCampaignResponse): Campaign {
  if (Array.isArray(payload)) return toCampaign(payload[0]);
  if ('data' in payload && payload.data) return toCampaign(Array.isArray(payload.data) ? payload.data[0] : payload.data);
  if ('campaign' in payload && payload.campaign) return toCampaign(payload.campaign);
  if ('results' in payload && payload.results?.[0]) return toCampaign(payload.results[0]);
  return toCampaign(payload as RawCampaign);
}

function buildCampaignPayload(
  draft: Partial<CampaignDraft>,
  status = 'draft',
  schedule?: { scheduledFor?: string; startDate?: string; endDate?: string; scheduleType?: string },
) {
  const body: Record<string, unknown> = {
    name: draft.name?.trim() ?? '',
    subject: draft.subject?.trim() ?? '',
    body: draft.body?.trim() ?? '',
    from_email: draft.fromEmail?.trim() ?? '',
    sender: draft.sender?.trim() ?? '',
    status,
    is_active: true,
  };

  if (draft.template) body.template = draft.template;
  if (draft.targetGroup !== undefined) body.target_group = draft.targetGroup.trim();
  if (draft.abTest !== undefined) body.ab_test = draft.abTest;
  if (schedule?.scheduledFor) body.scheduled_for = schedule.scheduledFor;
  if (schedule?.startDate) body.start_date = schedule.startDate;
  if (schedule?.endDate) body.end_date = schedule.endDate;
  if (schedule?.scheduleType) body.schedule_type = schedule.scheduleType;
  return body;
}

export async function listCampaigns(): Promise<Campaign[]> {
  const payload = await apiClient.get<CampaignResponse>('/mail-campaigns/');
  return extractCampaigns(payload);
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  const payload = await apiClient.get<SingleCampaignResponse>(`/campaigns/${encodeURIComponent(campaignId)}/`);
  return extractCampaign(payload);
}

export async function createCampaignDraft(draft: CampaignDraft, recipientsCount = 0): Promise<Campaign> {
  const payload = await apiClient.post<SingleCampaignResponse>('/campaigns/', {
    ...buildCampaignPayload(draft, 'draft'),
    recipients: recipientsCount,
  });
  return extractCampaign(payload);
}

export async function updateCampaign(campaignId: string, draft: Partial<CampaignDraft>): Promise<Campaign> {
  const payload = await apiClient.patch<SingleCampaignResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/`,
    buildCampaignPayload(draft, 'draft'),
  );
  return extractCampaign(payload);
}

export async function sendCampaign(campaignId: string): Promise<Campaign> {
  const payload = await apiClient.post<SingleCampaignResponse>(`/campaigns/${encodeURIComponent(campaignId)}/send/`);
  return extractCampaign(payload);
}

export interface ScheduleCampaignInput {
  scheduledFor: string;
  startDate: string;
  endDate: string;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
}

export async function scheduleCampaign(campaignId: string, schedule: ScheduleCampaignInput): Promise<Campaign> {
  const payload = await apiClient.patch<SingleCampaignResponse>(
    `/campaigns/${encodeURIComponent(campaignId)}/`,
    {
      status: 'scheduled',
      scheduled_for: schedule.scheduledFor,
      start_date: schedule.startDate,
      end_date: schedule.endDate,
      schedule_type: schedule.scheduleType,
      is_active: true,
    },
  );
  return extractCampaign(payload);
}

export interface CampaignHistoryEntry {
  id: string | number;
  timestamp: string;
  status: string;
  listName?: string;
  blasted: number;
  sent: number;
  bounced: number;
  clicked: number;
  opened: number;
}

export interface CampaignHistorySummary {
  totalSends: number;
  totalBlasted: number;
  totalSent: number;
  totalBounced: number;
  totalOpened: number;
  totalClicked: number;
}

export interface CampaignHistoryResponse {
  entries: CampaignHistoryEntry[];
  summary: CampaignHistorySummary;
}

export interface CampaignEmailEntry {
  id?: string | number;
  recipient: string;
  sent: string;
  delivered: string;
  opened: string;
  clicked: string;
}

interface RawCampaignHistoryEntry {
  id?: string | number;
  history_id?: string | number;
  timestamp?: string;
  sent_at?: string;
  sentAt?: string;
  created_at?: string;
  createdAt?: string;
  status?: string;
  event?: string;
  list_name?: string;
  list?: string;
  group_name?: string;
  blasted?: number | string;
  blast_count?: number | string;
  total_blasted?: number | string;
  sent?: number | string;
  sent_count?: number | string;
  total_sent?: number | string;
  bounced?: number | string;
  bounce_count?: number | string;
  total_bounced?: number | string;
  clicked?: number | string;
  click_count?: number | string;
  total_clicked?: number | string;
  opened?: number | string;
  open_count?: number | string;
  total_opened?: number | string;
}

interface RawCampaignEmailEntry {
  id?: string | number;
  recipient?: string | null;
  email?: string | null;
  to?: string | null;
  sent?: unknown;
  sent_at?: string | null;
  sentAt?: string | null;
  delivered?: unknown;
  delivered_at?: string | null;
  deliveredAt?: string | null;
  opened?: unknown;
  opened_at?: string | null;
  openedAt?: string | null;
  clicked?: unknown;
  clicked_at?: string | null;
  clickedAt?: string | null;
}

type HistoryPayload =
  | RawCampaignHistoryEntry[]
  | {
      results?: RawCampaignHistoryEntry[];
      data?: RawCampaignHistoryEntry[];
      history?: RawCampaignHistoryEntry[];
      summary?: Partial<CampaignHistorySummary> & Record<string, unknown>;
      total_sends?: number | string;
      total_blasted?: number | string;
      total_sent?: number | string;
      total_bounced?: number | string;
      total_opened?: number | string;
      total_clicked?: number | string;
    };

type EmailPayload =
  | RawCampaignEmailEntry[]
  | { results?: RawCampaignEmailEntry[]; data?: RawCampaignEmailEntry[]; emails?: RawCampaignEmailEntry[] };

function historyRows(payload: HistoryPayload): RawCampaignHistoryEntry[] {
  if (Array.isArray(payload)) return payload;
  return payload.results ?? payload.data ?? payload.history ?? [];
}

function historySummary(payload: HistoryPayload, rows: RawCampaignHistoryEntry[]): CampaignHistorySummary {
  const source: Record<string, unknown> = Array.isArray(payload)
    ? {}
    : ((payload.summary ?? payload) as Record<string, unknown>);
  const sum = (key: keyof CampaignHistorySummary, aliases: string[], fallback: number) => {
    const direct = source[key];
    if (direct !== undefined) return numberValue(direct, fallback);
    for (const alias of aliases) {
      const candidate = source[alias];
      if (candidate !== undefined) return numberValue(candidate, fallback);
    }
    return fallback;
  };

  const derived = rows.reduce(
    (acc, row) => {
      acc.totalBlasted += numberValue(row.blasted ?? row.blast_count ?? row.total_blasted);
      acc.totalSent += numberValue(row.sent ?? row.sent_count ?? row.total_sent);
      acc.totalBounced += numberValue(row.bounced ?? row.bounce_count ?? row.total_bounced);
      acc.totalOpened += numberValue(row.opened ?? row.open_count ?? row.total_opened);
      acc.totalClicked += numberValue(row.clicked ?? row.click_count ?? row.total_clicked);
      return acc;
    },
    { totalBlasted: 0, totalSent: 0, totalBounced: 0, totalOpened: 0, totalClicked: 0 },
  );

  return {
    totalSends: sum('totalSends', ['total_sends', 'count'], rows.length),
    totalBlasted: sum('totalBlasted', ['total_blasted'], derived.totalBlasted),
    totalSent: sum('totalSent', ['total_sent'], derived.totalSent),
    totalBounced: sum('totalBounced', ['total_bounced'], derived.totalBounced),
    totalOpened: sum('totalOpened', ['total_opened'], derived.totalOpened),
    totalClicked: sum('totalClicked', ['total_clicked'], derived.totalClicked),
  };
}

export async function getCampaignHistory(campaignId: string): Promise<CampaignHistoryResponse> {
  const payload = await apiClient.get<HistoryPayload>(
    `/mail-campaigns/${encodeURIComponent(campaignId)}/history/`,
  );
  const rawRows = historyRows(payload);
  const entries = rawRows.map((entry, index) => ({
    id: entry.id ?? entry.history_id ?? index,
    timestamp: entry.timestamp ?? entry.sent_at ?? entry.sentAt ?? entry.created_at ?? entry.createdAt ?? '',
    status: String(entry.status ?? entry.event ?? 'unknown'),
    listName: entry.list_name ?? entry.list ?? entry.group_name ?? undefined,
    blasted: numberValue(entry.blasted ?? entry.blast_count ?? entry.total_blasted),
    sent: numberValue(entry.sent ?? entry.sent_count ?? entry.total_sent),
    bounced: numberValue(entry.bounced ?? entry.bounce_count ?? entry.total_bounced),
    clicked: numberValue(entry.clicked ?? entry.click_count ?? entry.total_clicked),
    opened: numberValue(entry.opened ?? entry.open_count ?? entry.total_opened),
  }));

  return { entries, summary: historySummary(payload, rawRows) };
}

export async function getCampaignHistoryEmails(historyId: string | number): Promise<CampaignEmailEntry[]> {
  const payload = await apiClient.get<EmailPayload>(
    `/mail-campaigns/history/${encodeURIComponent(String(historyId))}/emails/`,
  );
  const rows = Array.isArray(payload) ? payload : payload.results ?? payload.data ?? payload.emails ?? [];
  return rows.map((row) => ({
    id: row.id,
    recipient: row.recipient ?? row.email ?? row.to ?? '—',
    sent: String(row.sent_at ?? row.sentAt ?? row.sent ?? '—'),
    delivered: String(row.delivered_at ?? row.deliveredAt ?? row.delivered ?? '—'),
    opened: String(row.opened_at ?? row.openedAt ?? row.opened ?? '—'),
    clicked: String(row.clicked_at ?? row.clickedAt ?? row.clicked ?? '—'),
  }));
}

export async function sendTestEmail(payload: { to: string; subject: string; html: string }): Promise<unknown> {
  return apiClient.post('/send-test-mail/', { ...payload, attachments: [] });
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  await apiClient.delete<void>(`/campaigns/${encodeURIComponent(campaignId)}/`);
}

export const saveCampaignDraft = createCampaignDraft;
