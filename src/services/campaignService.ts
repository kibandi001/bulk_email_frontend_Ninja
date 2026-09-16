// // Campaign Studio, Scheduler and Deliverability Testing (§4, §6, §7, §8).
// // Template selection now lives in templateService.ts / the Template Library
// // (§2) — CampaignStudio.tsx pulls from there instead of a fixed list.

// import { mockDelay } from './apiClient';
// import type { Campaign, CampaignDraft, DeliverabilityCheck } from '../types';

// const mockCampaigns: Campaign[] = [
//   { id: 'cm1', name: 'Licence Renewal Reminder — Q3', subject: 'Your NCA licence renewal is due', status: 'sent', recipients: 84210, openRate: 41.2, clickRate: 9.8, bounceRate: 0.6 },
//   { id: 'cm2', name: 'Contractor Registration Update', subject: 'Changes to registration categories', status: 'scheduled', recipients: 132880, scheduledFor: '2026-08-27T09:00:00+03:00' },
//   { id: 'cm3', name: 'Public Notice — Site Safety Advisory', subject: 'Site safety advisory for August', status: 'draft', recipients: 0 },
//   { id: 'cm4', name: 'Levy Payment Acknowledgement Batch', subject: 'Your payment has been received', status: 'sending', recipients: 21040 },
// ];

// const mockDeliverability: DeliverabilityCheck[] = [
//   { id: 'd1', campaignName: 'Licence Renewal Reminder — Q3', spamScore: 0.4, inboxPlacementPct: 97.1, runAt: '2026-08-19T10:00:00+03:00' },
//   { id: 'd2', campaignName: 'Contractor Registration Update', spamScore: 0.9, inboxPlacementPct: 94.3, runAt: '2026-08-23T14:00:00+03:00' },
// ];

// export async function listCampaigns(): Promise<Campaign[]> {
//   // TODO: return apiClient.get<Campaign[]>('/campaigns');
//   return mockDelay(mockCampaigns);
// }

// /** §4 "Save draft" — the frontend submits Campaign Studio state; the backend
//  * owns the generated id and validation. */
// export async function saveCampaignDraft(draft: CampaignDraft): Promise<Campaign> {
//   // TODO: return apiClient.post<Campaign>('/campaigns', draft);
//   return mockDelay({
//     id: crypto.randomUUID(),
//     name: draft.name,
//     subject: draft.subject,
//     status: 'draft',
//     recipients: 0,
//   });
// }

// /** §7 "Submit campaign to API" once pre-flight (§6) has passed. */
// export async function submitCampaign(
//   campaignId: string,
//   mode: { sendNow: true } | { sendNow: false; scheduledFor: string }
// ): Promise<Campaign> {
//   // TODO: return apiClient.post<Campaign>(`/campaigns/${campaignId}/submit`, mode);
//   const existing = mockCampaigns.find((c) => c.id === campaignId);
//   return mockDelay({
//     ...(existing ?? { id: campaignId, name: '', subject: '', recipients: 0 }),
//     status: 'scheduled' as const,
//     scheduledFor: mode.sendNow ? undefined : mode.scheduledFor,
//   });
// }

// /** §6 Deliverability Testing: spam score / inbox placement / rendering checks. */
// export async function listDeliverabilityChecks(): Promise<DeliverabilityCheck[]> {
//   // TODO: return apiClient.get<DeliverabilityCheck[]>('/deliverability/checks');
//   return mockDelay(mockDeliverability);
// }

// export async function runDeliverabilityCheck(campaignName: string): Promise<DeliverabilityCheck> {
//   // TODO: return apiClient.post<DeliverabilityCheck>('/deliverability/checks', { campaignName });
//   return mockDelay({
//     id: crypto.randomUUID(),
//     campaignName,
//     spamScore: 0.5,
//     inboxPlacementPct: 96,
//     runAt: new Date().toISOString(),
//   });
// }

// Campaign Studio (§4, §7, §8). Template selection lives in templateService.ts
// / the Template Library (§2) — CampaignStudio.tsx pulls from there instead
// of a fixed list. Scheduler and Deliverability Testing were removed.

import { mockDelay } from './apiClient';
import type { Campaign, CampaignDraft } from '../types';

const mockCampaigns: Campaign[] = [
  { id: 'cm1', name: 'Licence Renewal Reminder — Q3', subject: 'Your NCA licence renewal is due', status: 'sent', recipients: 84210, openRate: 41.2, clickRate: 9.8, bounceRate: 0.6 },
  { id: 'cm2', name: 'Contractor Registration Update', subject: 'Changes to registration categories', status: 'scheduled', recipients: 132880, scheduledFor: '2026-08-27T09:00:00+03:00' },
  { id: 'cm3', name: 'Public Notice — Site Safety Advisory', subject: 'Site safety advisory for August', status: 'draft', recipients: 0 },
  { id: 'cm4', name: 'Levy Payment Acknowledgement Batch', subject: 'Your payment has been received', status: 'sending', recipients: 21040 },
];

export async function listCampaigns(): Promise<Campaign[]> {
  // TODO: return apiClient.get<Campaign[]>('/campaigns');
  return mockDelay(mockCampaigns);
}

/** §4 "Save draft" — the frontend submits Campaign Studio state; the backend
 * owns the generated id and validation. */
export async function saveCampaignDraft(draft: CampaignDraft): Promise<Campaign> {
  // TODO: return apiClient.post<Campaign>('/campaigns', draft);
  return mockDelay({
    id: crypto.randomUUID(),
    name: draft.name,
    subject: draft.subject,
    status: 'draft',
    recipients: 0,
  });
}

/** §7 "Submit campaign to API" once pre-flight (§6) has passed. */
export async function submitCampaign(
  campaignId: string,
  mode: { sendNow: true } | { sendNow: false; scheduledFor: string }
): Promise<Campaign> {
  // TODO: return apiClient.post<Campaign>(`/campaigns/${campaignId}/submit`, mode);
  const existing = mockCampaigns.find((c) => c.id === campaignId);
  return mockDelay({
    ...(existing ?? { id: campaignId, name: '', subject: '', recipients: 0 }),
    status: 'scheduled' as const,
    scheduledFor: mode.sendNow ? undefined : mode.scheduledFor,
  });
}
