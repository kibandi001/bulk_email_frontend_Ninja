// Audit Log — immutable trail of user and system actions (§17).

import { API_BASE_URL } from '../config/constants';
import { apiClient, ApiError } from './apiClient';
import type { AuditLogEntry } from '../types';

/**
 * The audit endpoint is configurable because deployments may expose it under
 * a different path. Set VITE_AUDIT_LOG_ENDPOINT in .env when needed.
 */
const AUDIT_LOG_ENDPOINT = import.meta.env.VITE_AUDIT_LOG_ENDPOINT ?? '/audit/';

interface RawAuditEntry {
  id?: string | number;
  timestamp?: string;
  created_at?: string;
  actor?: string;
  actor_email?: string;
  user?: string;
  user_email?: string;
  action?: string;
  event?: string;
  event_type?: string;
  target?: string;
  resource?: string;
  resource_name?: string;
  detail?: string;
}

type AuditPayload =
  | RawAuditEntry[]
  | {
      results?: RawAuditEntry[];
      data?: RawAuditEntry[];
      logs?: RawAuditEntry[];
      audit_logs?: RawAuditEntry[];
    };

function rows(payload: AuditPayload): RawAuditEntry[] {
  if (Array.isArray(payload)) return payload;
  return payload.results ?? payload.data ?? payload.logs ?? payload.audit_logs ?? [];
}

function mapEntry(raw: RawAuditEntry, index: number): AuditLogEntry {
  return {
    id: String(raw.id ?? index),
    timestamp: raw.timestamp ?? raw.created_at ?? new Date(0).toISOString(),
    actor: raw.actor ?? raw.actor_email ?? raw.user ?? raw.user_email ?? 'system',
    action: raw.action ?? raw.event ?? raw.event_type ?? 'Unknown action',
    target: raw.target ?? raw.resource ?? raw.resource_name ?? raw.detail ?? '—',
  };
}

export async function listAuditLog(): Promise<AuditLogEntry[]> {
  const payload = await apiClient.get<AuditPayload>(AUDIT_LOG_ENDPOINT);
  return rows(payload).map(mapEntry);
}

/** Export the currently loaded audit log without relying on a second mock API. */
export function downloadAuditLog(entries: AuditLogEntry[]): void {
  const header = ['Timestamp', 'Actor', 'Action', 'Target'];
  const csv = [
    header,
    ...entries.map((entry) => [entry.timestamp, entry.actor, entry.action, entry.target]),
  ]
    .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function getAuditLogUrl(): string {
  return `${API_BASE_URL}${AUDIT_LOG_ENDPOINT}`;
}

export function isAuditApiError(error: unknown): boolean {
  return error instanceof ApiError;
}
