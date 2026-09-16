// Contacts & Lists, Consent Centre, Data Hygiene (§9, §10, §11).

import { mockDelay } from './apiClient';
import type { Contact, ContactImportResult, DataHygieneCheck } from '../types';

const mockContacts: Contact[] = [
  { id: 'c1', email: 'j.mwangi@example.co.ke', name: 'James Mwangi', lists: ['Contractors'], consent: 'granted', lastActivity: '2026-08-20' },
  { id: 'c2', email: 'a.otieno@example.co.ke', name: 'Alice Otieno', lists: ['Vendors', 'Licensing'], consent: 'granted', lastActivity: '2026-08-19' },
  { id: 'c3', email: 'p.kamau@example.co.ke', name: 'Peter Kamau', lists: ['Contractors'], consent: 'unsubscribed', lastActivity: '2026-08-11' },
  { id: 'c4', email: 'm.wafula@example.co.ke', name: 'Mary Wafula', lists: ['Employees'], consent: 'bounced', lastActivity: '2026-08-14' },
  { id: 'c5', email: 'd.kiptoo@example.co.ke', name: 'Daniel Kiptoo', lists: ['Licensing'], consent: 'pending', lastActivity: '2026-08-22' },
];

const mockHygieneChecks: DataHygieneCheck[] = [
  { label: 'Format validation', detail: '214,300 checked · 312 invalid addresses flagged', tone: 'verified' },
  { label: 'Global suppression', detail: '1,840 addresses withheld from all sends', tone: 'amber' },
  { label: 'De-duplication', detail: 'Last run merged 96 duplicate records', tone: 'verified' },
];

export async function listContacts(): Promise<Contact[]> {
  // TODO: return apiClient.get<Contact[]>('/contacts');
  return mockDelay(mockContacts);
}

/** §9 "Import" — upload is a separate step from this call in a real
 * integration (multipart upload, then poll this result), simplified here. */
export async function importContacts(_file: File): Promise<ContactImportResult> {
  // TODO: const form = new FormData(); form.append('file', _file);
  //       return apiClient.post<ContactImportResult>('/contacts/import', form);
  return mockDelay({ imported: 0, duplicates: 0, invalid: 0, suppressed: 0, failed: 0 });
}

/** §11 Consent/Preference Flow — "Submit change" → API → "Database updated". */
export async function updateConsent(
  contactId: string,
  consent: Contact['consent']
): Promise<Contact> {
  // TODO: return apiClient.patch<Contact>(`/contacts/${contactId}/consent`, { consent });
  const existing = mockContacts.find((c) => c.id === contactId);
  if (!existing) throw new Error(`Unknown contact ${contactId}`);
  return mockDelay({ ...existing, consent });
}

/** §11 "Unsubscribe flow" — contact becomes suppressed/unsubscribed. */
export async function unsubscribeContact(contactId: string): Promise<Contact> {
  return updateConsent(contactId, 'unsubscribed');
}

export async function listDataHygieneChecks(): Promise<DataHygieneCheck[]> {
  // TODO: return apiClient.get<DataHygieneCheck[]>('/contacts/hygiene');
  return mockDelay(mockHygieneChecks);
}
