// Shape used by GET /mail-campaign-stats/?summary=true (Tmail API).
// CONFIRMED against a live response (2026-09-15) — envelope is
// { status_code, message, data: {...} }, same pattern as mail-templates.
//
// Note: total_number_sent (campaigns marked fully "sent") and
// total_emails_sent (raw count of individual emails dispatched) are
// distinct fields and can disagree — e.g. a sample response showed
// total_number_sent: 0 but total_emails_sent: 3, presumably because no
// campaign had completed sending yet even though some emails had already
// gone out. Pick whichever matches what the dashboard tile is meant to
// represent, not just the more literally-named one.

export interface CampaignStatsSummary {
  totalEmailsSent: number;
  totalNumberSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounces: number;
  totalCampaigns: number;
  totalSubscribers: number;
  totalUnsubscribers: number;
  /** Percentage values (0–100) if the backend follows the same convention
   * as the existing client-computed avgOpenRate in analyticsService.ts —
   * unconfirmed since the sample response had all rates at 0. Re-check
   * once a nonzero example is available. */
  averageBounceRate: number;
  averageOpenRate: number;
  averageClickRate: number;
  sendingRate: number;
  deliveryRate: number;
  unsubscribeRate: number;
}

export interface CampaignStatsFilters {
  startDate: string;
  endDate: string;
}