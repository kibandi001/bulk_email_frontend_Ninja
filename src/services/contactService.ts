// Contacts & Lists, Consent Centre, Data Hygiene (§9, §10, §11).
// Supports multi-group subscriber memberships and CSV/Excel imports.

import * as XLSX from 'xlsx';
import { mockDelay } from './apiClient';
import type { Contact, ContactImportResult, ConsentStatus, DataHygieneCheck } from '../types';

const INITIAL_CONTACTS: Contact[] = [
  { id: 'c1', email: 'j.mwangi@example.co.ke', name: 'James Mwangi', lists: ['Contractors', 'Western Region'], consent: 'granted', lastActivity: '2026-08-20' },
  { id: 'c2', email: 'a.otieno@example.co.ke', name: 'Alice Otieno', lists: ['Vendors', 'Licensing'], consent: 'granted', lastActivity: '2026-08-19' },
  { id: 'c3', email: 'p.kamau@example.co.ke', name: 'Peter Kamau', lists: ['Contractors'], consent: 'unsubscribed', lastActivity: '2026-08-11' },
  { id: 'c4', email: 'm.wafula@example.co.ke', name: 'Mary Wafula', lists: ['Employees'], consent: 'bounced', lastActivity: '2026-08-14' },
  { id: 'c5', email: 'd.kiptoo@example.co.ke', name: 'Daniel Kiptoo', lists: ['Licensing', 'Contractors'], consent: 'pending', lastActivity: '2026-08-22' },
  { id: 'c6', email: 'f.wambui@nca.go.ke', name: 'Faith Wambui', lists: ['Employees', 'Licensing'], consent: 'granted', lastActivity: '2026-08-25' },
  { id: 'c7', email: 'k.rono@builders.co.ke', name: 'Kiprono Koech', lists: ['Contractors', 'VIP Contractors'], consent: 'granted', lastActivity: '2026-08-24' },
  { id: 'c8', email: 'supply@apexengineering.ke', name: 'Apex Engineering Ltd', lists: ['Vendors'], consent: 'granted', lastActivity: '2026-08-18' },
];

const STORAGE_KEY = 'nca_contacts_db';

function loadStoredContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [...INITIAL_CONTACTS];
}

let inMemoryContacts: Contact[] = loadStoredContacts();

function saveContacts(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryContacts));
  } catch {
    /* ignore */
  }
}

const mockHygieneChecks: DataHygieneCheck[] = [
  { label: 'Format validation', detail: '214,300 checked · 312 invalid addresses flagged', tone: 'verified' },
  { label: 'Global suppression', detail: '1,840 addresses withheld from all sends', tone: 'amber' },
  { label: 'De-duplication', detail: 'Last run merged 96 duplicate records', tone: 'verified' },
];

export async function listContacts(): Promise<Contact[]> {
  return mockDelay([...inMemoryContacts]);
}

/** Returns all unique groups/lists across the subscriber directory. */
export async function listGroups(): Promise<string[]> {
  const groupsSet = new Set<string>();
  inMemoryContacts.forEach((c) => {
    c.lists.forEach((g) => {
      const trimmed = g.trim();
      if (trimmed) groupsSet.add(trimmed);
    });
  });
  if (groupsSet.size === 0) {
    ['Contractors', 'Vendors', 'Licensing', 'Employees'].forEach((g) => groupsSet.add(g));
  }
  return mockDelay(Array.from(groupsSet).sort());
}

/** Get subscriber count for a specific group name. */
export async function getContactCountForGroup(groupName: string): Promise<number> {
  const trimmed = groupName.trim().toLowerCase();
  if (trimmed === 'all' || trimmed === 'all subscribers' || trimmed === 'all contacts') {
    return inMemoryContacts.length;
  }
  return inMemoryContacts.filter((c) =>
    c.lists.some((l) => l.trim().toLowerCase() === trimmed)
  ).length;
}

/** Parse an uploaded CSV or Excel file (.xlsx, .xls) and extract subscribers. */
export async function parseSubscriberFile(file: File): Promise<Array<{ email: string; name?: string; groups?: string[] }>> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  const subscribers: Array<{ email: string; name?: string; groups?: string[] }> = [];

  for (const row of rows) {
    let email = '';
    let name = '';
    const rowGroups: string[] = [];

    // Find email column
    for (const key of Object.keys(row)) {
      const val = String(row[key] ?? '').trim();
      const lowerKey = key.toLowerCase().trim();

      if (['email', 'e-mail', 'mail', 'email_address', 'recipient'].includes(lowerKey)) {
        email = val;
      } else if (['name', 'full_name', 'fullname', 'contact_name', 'user_name'].includes(lowerKey)) {
        name = val;
      } else if (['group', 'groups', 'list', 'lists', 'category', 'segment'].includes(lowerKey)) {
        if (val) {
          val.split(/[,;|]/).map((g) => g.trim()).filter(Boolean).forEach((g) => rowGroups.push(g));
        }
      } else if (!email && val.includes('@') && val.includes('.')) {
        email = val;
      }
    }

    if (email) {
      subscribers.push({
        email,
        name: name || undefined,
        groups: rowGroups.length > 0 ? rowGroups : undefined,
      });
    }
  }

  return subscribers;
}

/**
 * Imports subscribers from parsed data into contact store.
 * Users can belong to multiple groups; existing subscribers have their groups merged!
 */
export async function importSubscribers(
  subscribers: Array<{ email: string; name?: string; groups?: string[] }>,
  targetGroups: string[] = []
): Promise<ContactImportResult> {
  let imported = 0;
  let updated = 0;
  let duplicates = 0;
  let invalid = 0;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seenInBatch = new Set<string>();

  for (const item of subscribers) {
    const rawEmail = (item.email || '').trim().toLowerCase();
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      invalid++;
      continue;
    }

    if (seenInBatch.has(rawEmail)) {
      duplicates++;
      continue;
    }
    seenInBatch.add(rawEmail);

    // Merge groups assigned from UI and file row
    const assignedGroups = Array.from(
      new Set([...targetGroups, ...(item.groups || [])])
    ).filter(Boolean);

    const defaultGroups = assignedGroups.length > 0 ? assignedGroups : ['General'];

    const existingIndex = inMemoryContacts.findIndex(
      (c) => c.email.trim().toLowerCase() === rawEmail
    );

    if (existingIndex >= 0) {
      // User can be in multiple groups: merge groups
      const existing = inMemoryContacts[existingIndex];
      const mergedLists = Array.from(new Set([...existing.lists, ...defaultGroups]));
      inMemoryContacts[existingIndex] = {
        ...existing,
        name: item.name?.trim() || existing.name,
        lists: mergedLists,
        lastActivity: new Date().toISOString().split('T')[0],
      };
      updated++;
    } else {
      // Create new contact
      const displayName = item.name?.trim() || rawEmail.split('@')[0].replace(/[._-]/g, ' ');
      const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      const newContact: Contact = {
        id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: rawEmail,
        name: formattedName,
        lists: defaultGroups,
        consent: 'granted',
        lastActivity: new Date().toISOString().split('T')[0],
      };
      inMemoryContacts.push(newContact);
      imported++;
    }
  }

  saveContacts();
  return mockDelay({
    imported,
    updated,
    duplicates,
    invalid,
    suppressed: 0,
    failed: 0,
  });
}

/** Import directly from an uploaded File (CSV or Excel) */
export async function importContacts(file: File, targetGroups: string[] = []): Promise<ContactImportResult> {
  const parsed = await parseSubscriberFile(file);
  return importSubscribers(parsed, targetGroups);
}

/** Update groups for an individual contact */
export async function updateContactGroups(contactId: string, groups: string[]): Promise<Contact> {
  const idx = inMemoryContacts.findIndex((c) => c.id === contactId);
  if (idx === -1) throw new Error(`Contact ${contactId} not found`);
  inMemoryContacts[idx] = {
    ...inMemoryContacts[idx],
    lists: groups.filter(Boolean),
  };
  saveContacts();
  return mockDelay(inMemoryContacts[idx]);
}

/** Add a single contact manually */
export async function addContact(contact: {
  email: string;
  name?: string;
  lists: string[];
  consent?: ConsentStatus;
}): Promise<Contact> {
  const rawEmail = contact.email.trim().toLowerCase();
  const existingIdx = inMemoryContacts.findIndex((c) => c.email.toLowerCase() === rawEmail);

  if (existingIdx >= 0) {
    const existing = inMemoryContacts[existingIdx];
    const merged = Array.from(new Set([...existing.lists, ...contact.lists]));
    inMemoryContacts[existingIdx] = {
      ...existing,
      lists: merged,
      name: contact.name?.trim() || existing.name,
      consent: contact.consent || existing.consent,
    };
    saveContacts();
    return mockDelay(inMemoryContacts[existingIdx]);
  }

  const newContact: Contact = {
    id: `c_${Date.now()}`,
    email: rawEmail,
    name: contact.name?.trim() || rawEmail.split('@')[0],
    lists: contact.lists.length > 0 ? contact.lists : ['General'],
    consent: contact.consent || 'granted',
    lastActivity: new Date().toISOString().split('T')[0],
  };
  inMemoryContacts.push(newContact);
  saveContacts();
  return mockDelay(newContact);
}

/** Delete a contact */
export async function deleteContact(contactId: string): Promise<void> {
  inMemoryContacts = inMemoryContacts.filter((c) => c.id !== contactId);
  saveContacts();
  return mockDelay(undefined);
}

/** §11 Consent/Preference Flow — "Submit change" → API → "Database updated". */
export async function updateConsent(
  contactId: string,
  consent: Contact['consent']
): Promise<Contact> {
  const existing = inMemoryContacts.find((c) => c.id === contactId);
  if (!existing) throw new Error(`Unknown contact ${contactId}`);
  existing.consent = consent;
  saveContacts();
  return mockDelay({ ...existing });
}

/** §11 "Unsubscribe flow" — contact becomes suppressed/unsubscribed. */
export async function unsubscribeContact(contactId: string): Promise<Contact> {
  return updateConsent(contactId, 'unsubscribed');
}

export async function listDataHygieneChecks(): Promise<DataHygieneCheck[]> {
  return mockDelay(mockHygieneChecks);
}

