import { apiClient } from './apiClient';
import { listPaginatedSubscribers, uploadSubscriberCsv } from './subscriberService';
import type { Contact, ContactImportResult, ConsentStatus, DataHygieneCheck } from '../types';
import type { Subscriber } from '../types/subscriber';

// Helper to convert backend Subscriber -> UI Contact
function mapSubscriberToContact(sub: Subscriber): Contact {
  const fullName = [sub.first_name, sub.last_name]
    .filter((n) => n && n.trim() && n.toLowerCase() !== 'nan')
    .join(' ');

  let consent: ConsentStatus = 'granted';
  if (sub.is_blacklisted) {
    consent = 'bounced';
  } else if (!sub.is_subscribed) {
    consent = 'unsubscribed';
  }

  return {
    id: String(sub.id),
    email: sub.email,
    name: fullName || sub.email,
    lists: sub.group_name ? [sub.group_name] : [],
    consent,
    lastActivity: sub.created_at || '—',
  };
}

/** Fetch contacts from the live backend */
export async function listContacts(search?: string): Promise<Contact[]> {
  try {
    const response = await listPaginatedSubscribers({
      limit: 100,
      offset: 0,
      email: search,
    });
    // Safely extract the subscriber list regardless of response wrapper
    const items: Subscriber[] =
      Array.isArray(response) ? response :
        Array.isArray((response as any)?.results) ? (response as any).results :
          Array.isArray((response as any)?.data) ? (response as any).data :
            Array.isArray((response as any)?.data?.results) ? (response as any).data.results :
              [];
    return items.map(mapSubscriberToContact);
  } catch (err) {
    console.error('Failed to list contacts:', err);
    return [];
  }
}


/** Import contacts via CSV upload */
export async function importContacts(file: File, groupId: number = 94): Promise<ContactImportResult> {
  await uploadSubscriberCsv(file, groupId);
  return { imported: 1, duplicates: 0, invalid: 0, suppressed: 0, failed: 0 };
}

/** Update consent status by patching the subscriber */
export async function updateConsent(
  contactId: string,
  consent: Contact['consent']
): Promise<void> {
  const isSubscribed = consent === 'granted';
  const isBlacklisted = consent === 'bounced';

  await apiClient.patch(`/subscribers/${contactId}/`, {
    is_subscribed: isSubscribed,
    is_blacklisted: isBlacklisted,
  });
}

/** Unsubscribe a contact */
export async function unsubscribeContact(contactId: string): Promise<void> {
  return updateConsent(contactId, 'unsubscribed');
}
const mockHygieneChecks: DataHygieneCheck[] = [
  { label: 'Format validation', detail: '214,300 checked · 312 invalid addresses flagged', tone: 'verified' },
  { label: 'Global suppression', detail: '1,840 addresses withheld from all sends', tone: 'amber' },
  { label: 'De-duplication', detail: 'Last run merged 96 duplicate records', tone: 'verified' },
];
export async function listDataHygieneChecks(): Promise<DataHygieneCheck[]> {
  return mockHygieneChecks;
}
