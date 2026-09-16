// Contact record and consent/preference shapes.
// Populated by services/contactService.ts (§9, §10, §11).

export type ConsentStatus = 'granted' | 'unsubscribed' | 'bounced' | 'pending';

export interface Contact {
  id: string;
  email: string;
  name: string;
  lists: string[];
  consent: ConsentStatus;
  lastActivity: string;
}

export type ContactImportResult = {
  imported: number;
  duplicates: number;
  invalid: number;
  suppressed: number;
  failed: number;
};

export interface DataHygieneCheck {
  label: string;
  detail: string;
  tone: 'verified' | 'amber';
}
