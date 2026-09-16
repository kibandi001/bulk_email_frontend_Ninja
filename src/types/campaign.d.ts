// // Campaign lifecycle, drafting, and pre-flight/deliverability check shapes.
// // Populated by services/campaignService.ts (§4, §6, §7, §8).

// export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';

// export interface Campaign {
//   id: string;
//   name: string;
//   subject: string;
//   status: CampaignStatus;
//   recipients: number;
//   scheduledFor?: string;
//   openRate?: number;
//   clickRate?: number;
//   bounceRate?: number;
// }

// export interface CampaignDraft {
//   name: string;
//   subject: string;
//   template: string;
//   abTest: boolean;
// }

// export interface DeliverabilityCheck {
//   id: string;
//   campaignName: string;
//   spamScore: number;
//   inboxPlacementPct: number;
//   runAt: string;
// }

// Campaign lifecycle and drafting shapes. Populated by
// services/campaignService.ts (§4, §7, §8).

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  recipients: number;
  scheduledFor?: string;
  openRate?: number;
  clickRate?: number;
  bounceRate?: number;
}

export interface CampaignDraft {
  name: string;
  subject: string;
  template: string;
  abTest: boolean;
}
