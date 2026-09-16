// Standalone reporting engine shapes (distinct from ad-hoc Analytics).
// Populated by services/reportService.ts (§13).

export type ReportType =
  | 'campaign_performance'
  | 'audience_growth'
  | 'deliverability'
  | 'consent_activity';

export interface ReportDefinition {
  id: string;
  name: string;
  type: ReportType;
  lastGenerated: string;
  scheduled: boolean;
}
