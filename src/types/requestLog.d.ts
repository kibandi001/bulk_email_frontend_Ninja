// Shape used by GET /logs/stats/ (Tmail API, "Request Logs" folder).
// Distinct from the app's existing AuditLogEntry (admin/user actions —
// see auditService.ts): this endpoint's filters (log_status, action_id)
// read as request/API-call-level logs rather than human admin actions, so
// it's modelled and displayed separately as "Request Logs" rather than
// folded into the Audit Log page.
//
// CONFIRMED against a live response (2026-09-14): standard DRF
// count/next/previous/results pagination. "stats" was a red herring —
// this returns individual log rows, not aggregated counts.

export interface RequestLogEntry {
  id: number;
  /** e.g. "Login", "user sent test campaign", "Edited template" — a
   * human-readable description of what happened, not a technical action ID. */
  logName: string;
  actionId: string | number;
  status: string;
  createdAt: string;
  /** The user/email string TMail associates with this log entry. */
  userId: string;
  /** Raw JSON string with request-specific context (varies by log type —
   * e.g. {"email": "..."} for logins, {"request_method": "POST", ...} for
   * template/campaign actions). Left as a string; parse per-log-type at
   * display time if needed rather than guessing one shape here. */
  detail?: string;
  deviceIp?: string;
  /** Raw string — sometimes a plain user-agent string, sometimes a JSON
   * blob like {"user_agent": "...", "referer": "..."} depending on log type. */
  deviceDetails?: string;
}

export interface RequestLogFilters {
  startDate?: string;
  endDate?: string;
  logStatus?: string;
  actionId?: string;
}