// Dashboard aggregations and the Insight → Analytics module (§3, §12).
// Analytics reads the same campaign records as Campaigns; it's a distinct
// service (rather than reusing campaignService directly from features/) so
// dashboard/analytics-specific aggregation logic has one home.

import { listCampaigns } from './campaignService';
import type { Campaign } from '../types';

export interface DashboardSummary {
  sentTotal: number;
  completedCount: number;
  avgOpenRate: number;
  inFlightCount: number;
  recentCampaigns: Campaign[];
}

/** §3 Dashboard Flow — fetch + derive the headline tiles and recent list. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const campaigns = await listCampaigns();
  const sent = campaigns.filter((c) => c.status === 'sent');
  const withOpenRate = sent.filter((c) => c.openRate !== undefined);

  return {
    sentTotal: sent.reduce((sum, c) => sum + c.recipients, 0),
    completedCount: sent.length,
    avgOpenRate: withOpenRate.length
      ? withOpenRate.reduce((sum, c) => sum + (c.openRate ?? 0), 0) / withOpenRate.length
      : 0,
    inFlightCount: campaigns.filter((c) => c.status === 'scheduled' || c.status === 'sending').length,
    recentCampaigns: campaigns,
  };
}

/** §12 Analytics Flow — completed-campaign performance table. */
export async function getCampaignPerformance(): Promise<Campaign[]> {
  const campaigns = await listCampaigns();
  return campaigns.filter((c) => c.status === 'sent');
}

/** §12 "Campaign comparison" — select A and B, return both records. */
export async function compareCampaigns(
  campaignIdA: string,
  campaignIdB: string
): Promise<{ a: Campaign | undefined; b: Campaign | undefined }> {
  const campaigns = await listCampaigns();
  return {
    a: campaigns.find((c) => c.id === campaignIdA),
    b: campaigns.find((c) => c.id === campaignIdB),
  };
}
