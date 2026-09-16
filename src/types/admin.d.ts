// Quota, audit trail, and platform health shapes.
// Populated by services/adminService.ts and services/auditService.ts (§15, §16, §17, §21).

export interface QuotaMetric {
  label: string;
  used: number;
  limit: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
}

export type ServiceStatus = 'operational' | 'degraded' | 'down';

export interface SystemStatusSnapshot {
  service: string;
  status: ServiceStatus;
  detail: string;
}

export interface StatusIncident {
  id: string;
  title: string;
  occurredAt: string;
  resolved: boolean;
}
