// Per-recipient message event timeline shape.
// Populated by services/messageService.ts (§14).

export type MessageEvent =
  | 'submitted'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

export interface MessageLogEntry {
  id: string;
  recipient: string;
  campaignName: string;
  status: MessageEvent;
  timestamp: string;
  failureReason?: string;
}
