// Campaign stats summary (Tmail API, GET /mail-campaign-stats/?summary=true).
// See types/campaignStats.d.ts for field notes — shape confirmed against a
// live response (2026-09-15).

import { apiClient } from './apiClient';
import type { CampaignStatsFilters, CampaignStatsSummary } from '../types/campaignStats';

interface RawCampaignStats {
  total_number_sent: number;
  total_number_delivered: number;
  total_number_opened: number;
  total_number_clicked: number;
  total_bounces: number;
  total_campaigns: number;
  total_subscribers: number;
  total_unsubscribers: number;
  total_emails_sent: number;
  average_bounce_rate: number;
  average_open_rate: number;
  average_click_rate: number;
  sending_rate: number;
  delivery_rate: number;
  unsubscribe_rate: number;
}

interface RawCampaignStatsResponse {
  status_code: number;
  message: string;
  data: RawCampaignStats;
}

function toSummary(raw: RawCampaignStats): CampaignStatsSummary {
  return {
    totalEmailsSent: raw.total_emails_sent,
    totalNumberSent: raw.total_number_sent,
    totalDelivered: raw.total_number_delivered,
    totalOpened: raw.total_number_opened,
    totalClicked: raw.total_number_clicked,
    totalBounces: raw.total_bounces,
    totalCampaigns: raw.total_campaigns,
    totalSubscribers: raw.total_subscribers,
    totalUnsubscribers: raw.total_unsubscribers,
    averageBounceRate: raw.average_bounce_rate,
    averageOpenRate: raw.average_open_rate,
    averageClickRate: raw.average_click_rate,
    sendingRate: raw.sending_rate,
    deliveryRate: raw.delivery_rate,
    unsubscribeRate: raw.unsubscribe_rate,
  };
}

/** GET /mail-campaign-stats/?summary=true&start_date=&end_date= */
export async function getCampaignStatsSummary(
  filters: CampaignStatsFilters
): Promise<CampaignStatsSummary> {
  const params = new URLSearchParams({
    summary: 'true',
    start_date: filters.startDate,
    end_date: filters.endDate,
  });
  const response = await apiClient.get<RawCampaignStatsResponse>(
    `/mail-campaign-stats/?${params.toString()}`
  );
  return toSummary(response.data);
}