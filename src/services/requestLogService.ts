// Request Logs (Tmail API, "Request Logs" folder) — see types/requestLog.d.ts
// for the confirmed response shape.

import { apiClient } from './apiClient';
import type { RequestLogEntry, RequestLogFilters } from '../types';

interface RawRequestLog {
  id: number;
  log_id: string;
  log_name: string;
  device_ip: string;
  log_details: string;
  user_id: string;
  partner_id: string | number | null;
  log_status: string;
  createdon: string;
  share_user: string;
  action_id: string | number;
  device_details: string;
  request_timestamp: string;
}

interface RawRequestLogPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawRequestLog[];
}

function toEntry(raw: RawRequestLog): RequestLogEntry {
  return {
    id: raw.id,
    logName: raw.log_name,
    actionId: raw.action_id,
    status: raw.log_status,
    createdAt: raw.createdon,
    userId: raw.user_id,
    detail: raw.log_details,
    deviceIp: raw.device_ip,
    deviceDetails: raw.device_details,
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