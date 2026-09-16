// Shape used by GET /logs/stats/ (Tmail API, "Request Logs" folder).
// Distinct from the app's existing AuditLogEntry (admin/user actions,
// currently still mocked — see auditService.ts): this endpoint's filters
// (log_status, action_id) read as request/API-call-level logs rather than
// human admin actions, so it's modelled and displayed separately as
// "Request Logs" rather than folded into the Audit Log page.
//
// No example response was saved in the collection, so RawRequestLog and the
// page envelope are assumed to mirror standard DRF `page`/`page_size`
// pagination with `count`/`results` — confirm against a live response. The
// path name "stats" also raises the possibility this actually returns
// aggregated counts rather than individual rows; worth double-checking with
// the backend team.

export interface RequestLogEntry {
  id: number;
  actionId: string | number;
  status: string;
  createdAt: string;
  detail?: string;
}

export interface RequestLogFilters {
  startDate?: string;
  endDate?: string;
  logStatus?: string;
  actionId?: string;
}
