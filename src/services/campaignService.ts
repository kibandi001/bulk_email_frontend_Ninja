

import { ApiError, apiClient } from './apiClient';
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
  const subjectValue = (
    raw.subject ??
    raw.campaign_subject ??
    (raw as any).email_subject ??
    (raw as any).subject_line ??
    (raw as any).title ??
    ''
  ).trim();

  const nameValue = (
    raw.name ??
    raw.title ??
    raw.campaign_name ??
    ''
  ).trim() || `Campaign ${raw.id}`;

  const bodyValue = raw.body ?? raw.html ?? (raw as any).content ?? undefined;

  return {
    id: String(raw.id),
    name: nameValue,
    subject: subjectValue,
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
    body: bodyValue,
    fromEmail: raw.fromEmail ?? raw.from_email ?? undefined,
    sender: raw.sender ?? undefined,
    template: raw.template == null ? undefined : String(raw.template),
    groupIds: Array.isArray((raw as any).group_ids) ? (raw as any).group_ids.map(Number) : undefined,
    recipientIds: Array.isArray((raw as any).recipient_ids) ? (raw as any).recipient_ids.map(Number) : undefined,
    frequency: (raw as any).frequency ?? undefined,
    startDate: (raw as any).start_date ?? undefined,
    endDate: (raw as any).end_date ?? undefined,
    startTime: (raw as any).start_time ?? undefined,
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

export interface CreateCampaignOptions {
  recipient_ids?: number[];
  group_ids?: number[];
  frequency?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string | null;
  attachments?: File[];
}

export function getTodayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDate(dateStr: string, days = 1): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return getTodayDate();
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildCampaignData(
  draft: Partial<CampaignDraft>,
  options: CreateCampaignOptions = {}
): FormData | Record<string, unknown> {
  const attachments = options.attachments || draft.attachments || [];
  const hasFiles = Array.isArray(attachments) && attachments.length > 0 && attachments[0] instanceof File;

  const today = getTodayDate();
  const name = draft.name?.trim() ?? '';
  const subject = draft.subject?.trim() ?? '';
  const body = draft.body?.trim() ?? '';
  const from_email = draft.fromEmail?.trim() || 'help@tililtech.com';
  const frequency = options.frequency || draft.frequency || 'immediately';
  const start_date = options.start_date || draft.start_date || today;
  const rawEndDate = options.end_date || draft.end_date || '';
  const end_date = rawEndDate && rawEndDate > start_date ? rawEndDate : addDaysToDate(start_date, 1);
  const start_time = options.start_time ?? draft.start_time ?? null;
  const recipient_ids = options.recipient_ids || draft.recipient_ids || [];
  const group_ids = options.group_ids || draft.group_ids || [];

  if (hasFiles) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('subject', subject);
    formData.append('body', body);
    formData.append('from_email', from_email);
    formData.append('frequency', frequency);
    formData.append('start_date', start_date);
    formData.append('end_date', end_date);
    if (start_time) formData.append('start_time', start_time);

    recipient_ids.forEach((id: number) => formData.append('recipient_ids', String(id)));
    group_ids.forEach((id: number) => formData.append('group_ids', String(id)));
    attachments.forEach((file: File) => formData.append('attachments', file));

    return formData;
  }

  return {
    name,
    recipient_ids,
    group_ids,
    subject,
    body,
    frequency,
    start_date,
    end_date,
    from_email,
    start_time,
    attachments: [],
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const payload = await apiClient.get<CampaignResponse>('/mail-campaigns/');
  return extractCampaigns(payload);
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  try {
    const payload = await apiClient.get<SingleCampaignResponse>(
      `/mail-campaigns/${encodeURIComponent(campaignId)}/`
    );
    return extractCampaign(payload);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      const fallback = await apiClient.get<SingleCampaignResponse>(
        `/campaigns/${encodeURIComponent(campaignId)}/`
      );
      return extractCampaign(fallback);
    }
    throw err;
  }
}

export async function createCampaignDraft(
  draft: CampaignDraft,
  optionsOrCount: CreateCampaignOptions | number = {}
): Promise<Campaign> {
  const options: CreateCampaignOptions =
    typeof optionsOrCount === 'number' ? {} : optionsOrCount;
  const payload = buildCampaignData(draft, options);
  const res = await apiClient.post<SingleCampaignResponse>('/mail-campaigns/', payload);
  return extractCampaign(res);
}

export async function updateCampaign(
  campaignId: string,
  draft: Partial<CampaignDraft>,
  options: CreateCampaignOptions = {}
): Promise<Campaign> {
  const payload = buildCampaignData(draft, options);
  try {
    const res = await apiClient.patch<SingleCampaignResponse>(
      `/mail-campaigns/${encodeURIComponent(campaignId)}/`,
      payload
    );
    return extractCampaign(res);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      const res = await apiClient.patch<SingleCampaignResponse>(
        `/campaigns/${encodeURIComponent(campaignId)}/`,
        payload
      );
      return extractCampaign(res);
    }
    throw err;
  }
}

export async function sendCampaign(campaignId: string): Promise<Campaign> {
  try {
    const payload = await apiClient.post<SingleCampaignResponse>(
      `/mail-campaigns/${encodeURIComponent(campaignId)}/send/`
    );
    return extractCampaign(payload);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return getCampaign(campaignId);
    }
    throw err;
  }
}

export interface ScheduleCampaignInput {
  scheduledFor: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  scheduleType: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
}

export async function scheduleCampaign(campaignId: string, schedule: ScheduleCampaignInput): Promise<Campaign> {
  const startDate = schedule.startDate || getTodayDate();
  const endDate = schedule.endDate && schedule.endDate > startDate ? schedule.endDate : addDaysToDate(startDate, 1);
  const payload = await apiClient.patch<SingleCampaignResponse>(
    `/mail-campaigns/${encodeURIComponent(campaignId)}/`,
    {
      frequency: schedule.scheduleType,
      start_date: startDate,
      end_date: endDate,
      ...(schedule.startTime ? { start_time: schedule.startTime } : {}),
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
  number_sent?: number | string;
  number_bounced?: number | string;
  number_opened?: number | string;
  number_clicked?: number | string;
  recipient_count?: number | string;
  sent?: number | string;
  sent_count?: number | string;
  total_sent?: number | string;
  total_number_sent?: number | string;
  total_emails_sent?: number | string;
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
    total_number_sent?: number | string;
    total_emails_sent?: number | string;
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
      acc.totalBlasted += numberValue(row.blasted ?? row.blast_count ?? row.total_blasted ?? row.recipient_count);
      acc.totalSent += numberValue(row.sent ?? row.sent_count ?? row.total_sent ?? row.number_sent ?? row.total_number_sent ?? 0);
      acc.totalBounced += numberValue(row.bounced ?? row.bounce_count ?? row.total_bounced ?? row.number_bounced);
      acc.totalOpened += numberValue(row.opened ?? row.open_count ?? row.total_opened ?? row.number_opened);
      acc.totalClicked += numberValue(row.clicked ?? row.click_count ?? row.total_clicked ?? row.number_clicked);
      return acc;
    },
    { totalBlasted: 0, totalSent: 0, totalBounced: 0, totalOpened: 0, totalClicked: 0 },
  );

  return {
    totalSends: sum('totalSends', ['total_sends', 'count'], rows.length),
    totalBlasted: sum('totalBlasted', ['total_blasted', 'recipient_count'], derived.totalBlasted),
    totalSent: sum('totalSent', ['total_sent', 'total_emails_sent', 'total_number_sent', 'number_sent'], derived.totalSent),
    totalBounced: sum('totalBounced', ['total_bounced', 'number_bounced'], derived.totalBounced),
    totalOpened: sum('totalOpened', ['total_opened', 'number_opened'], derived.totalOpened),
    totalClicked: sum('totalClicked', ['total_clicked', 'number_clicked'], derived.totalClicked),
  };
}

export async function getCampaignHistory(campaignId: string): Promise<CampaignHistoryResponse> {
  const payload = await apiClient.get<HistoryPayload>(
    `/mail-campaigns/${encodeURIComponent(campaignId)}/history/`,
  );
  console.log('CAMPAIGN HISTORY FULL ROW:', JSON.stringify((payload as any)?.data?.[0], null, 2));

  // console.log('CAMPAIGN HISTORY PAYLOAD', JSON  .stringify(payload as any) null, 2));
  const rawRows = historyRows(payload);
  const entries = rawRows.map((entry, index) => ({
    id: entry.id ?? entry.history_id ?? index,
    timestamp: entry.timestamp ?? entry.sent_at ?? entry.sentAt ?? entry.created_at ?? entry.createdAt ?? '',
    status: String(entry.status ?? entry.event ?? 'unknown'),
    listName: entry.list_name ?? entry.list ?? entry.group_name ?? undefined,
    blasted: numberValue(entry.blasted ?? entry.blast_count ?? entry.total_blasted ?? entry.recipient_count),
    sent: numberValue(entry.sent ?? entry.sent_count ?? entry.total_sent ?? entry.number_sent ?? entry.total_emails_sent ?? entry.total_number_sent),
    bounced: numberValue(entry.bounced ?? entry.bounce_count ?? entry.total_bounced ?? entry.number_bounced),
    clicked: numberValue(entry.clicked ?? entry.click_count ?? entry.total_clicked ?? entry.number_clicked),
    opened: numberValue(entry.opened ?? entry.open_count ?? entry.total_opened ?? entry.number_opened),
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

export interface SendTestEmailPayload {
  to: string;
  subject: string;
  html: string;
  from_email?: string;
  sender?: string;
  attachments?: Record<string, unknown> | unknown[];
}

interface TestEmailGatewayResponse {
  status_code?: number | string;
  message?: string;
  response_data?: {
    status_code?: string | number;
    status_desc?: string;
    email_id?: string | number;
    to?: string;
  };
}

export async function sendTestEmail(payload: SendTestEmailPayload): Promise<unknown> {
  const fromEmail = payload.from_email?.trim() || 'help@tililtech.com';
  const senderName = payload.sender?.trim() || 'Tilil Technologies';

  const targetEmail = payload.to?.trim() ?? '';

  const res = await apiClient.post<TestEmailGatewayResponse>('/send-test-mail/', {
    subject: payload.subject?.trim() ?? '',
    html: payload.html?.trim() ?? '',
    from: fromEmail,
    to: targetEmail,
    sender: senderName,
    attachments: payload.attachments ?? {},
  });

  // Check if the downstream mail gateway rejected the dispatch
  if (res && typeof res === 'object') {
    const gateway = res.response_data;
    if (gateway && typeof gateway === 'object') {
      const code = String(gateway.status_code ?? '');
      if (code && code !== '1000' && code !== '200') {
        const desc = gateway.status_desc || 'Gateway rejected test email';
        throw new Error(`Gateway Error (${code}): ${desc}`);
      }
    }
  }

  return res;
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  try {
    await apiClient.delete<void>(`/mail-campaigns/${encodeURIComponent(campaignId)}/`);
  } catch {
    await apiClient.delete<void>(`/campaigns/${encodeURIComponent(campaignId)}/`);
  }
}

export const saveCampaignDraft = createCampaignDraft;
