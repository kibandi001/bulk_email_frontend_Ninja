// Request Logs (Tmail API, "Request Logs" folder) — see types/requestLog.d.ts
// for notes on the assumptions baked into this mapping.

import { apiClient } from './apiClient';
import type { RequestLogEntry, RequestLogFilters } from '../types';

interface RawRequestLog {
  id: number;
  action_id: string | number;
  log_status: string;
  created_at: string;
  detail?: string;
}

interface RawRequestLogPage {
  count: number;
  results: RawRequestLog[];
}

function toEntry(raw: RawRequestLog): RequestLogEntry {
  return {
    id: raw.id,
    actionId: raw.action_id,
    status: raw.log_status,
    createdAt: raw.created_at,
    detail: raw.detail,
  };
}

export interface ListRequestLogsResult {
  logs: RequestLogEntry[];
  total: number;
}

export async function listRequestLogs(
  filters: RequestLogFilters = {},
  page = 1,
  pageSize = 20
): Promise<ListRequestLogsResult> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.logStatus) params.set('log_status', filters.logStatus);
  if (filters.actionId) params.set('action_id', filters.actionId);

  const page_ = await apiClient.get<RawRequestLogPage>(`/logs/stats/?${params.toString()}`);
  return { logs: page_.results.map(toEntry), total: page_.count };
}
