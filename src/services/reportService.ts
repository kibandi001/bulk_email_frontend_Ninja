// Standalone Reports module — saved, regenerable/exportable definitions,
// distinct from ad-hoc Analytics (§13).

import { mockDelay } from './apiClient';
import type { ReportDefinition } from '../types';

const mockReports: ReportDefinition[] = [
  { id: 'r1', name: 'Monthly campaign performance', type: 'campaign_performance', lastGenerated: '2026-08-01T08:00:00+03:00', scheduled: true },
  { id: 'r2', name: 'Contact base growth', type: 'audience_growth', lastGenerated: '2026-08-15T08:00:00+03:00', scheduled: false },
  { id: 'r3', name: 'Deliverability trend', type: 'deliverability', lastGenerated: '2026-08-20T08:00:00+03:00', scheduled: true },
  { id: 'r4', name: 'Consent & unsubscribe activity', type: 'consent_activity', lastGenerated: '2026-08-10T08:00:00+03:00', scheduled: false },
];

export async function listReports(): Promise<ReportDefinition[]> {
  // TODO: return apiClient.get<ReportDefinition[]>('/reports');
  return mockDelay(mockReports);
}

/** §13 "Generate report" against the selected filters. */
export async function generateReport(reportId: string): Promise<ReportDefinition> {
  // TODO: return apiClient.post<ReportDefinition>(`/reports/${reportId}/generate`);
  const existing = mockReports.find((r) => r.id === reportId);
  if (!existing) throw new Error(`Unknown report ${reportId}`);
  return mockDelay({ ...existing, lastGenerated: new Date().toISOString() });
}

/** §13 "Export CSV" / "Export Excel" — returns a download URL from the backend. */
export async function exportReport(
  reportId: string,
  format: 'csv' | 'excel'
): Promise<{ downloadUrl: string }> {
  // TODO: return apiClient.get<{ downloadUrl: string }>(`/reports/${reportId}/export?format=${format}`);
  return mockDelay({ downloadUrl: `/mock-exports/${reportId}.${format === 'csv' ? 'csv' : 'xlsx'}` });
}
