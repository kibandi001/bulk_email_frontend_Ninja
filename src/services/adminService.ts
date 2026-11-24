// Quota & Alerts, User Administration, Roles & Permissions, System Status
// (§15, §16, §21).
//
// User Administration is wired to the real Tmail API ("Users" and
// "Invitations" folders). Quota, Roles & Permissions, and System Status stay
// on mock data below — the Postman collection has no matching endpoints for
// them, so there's nothing to integrate against yet.

import { apiClient, mockDelay } from './apiClient';
import { roleFromIsAdmin } from './authService';
import type {
  ManagedUser,
  Permission,
  QuotaMetric,
  RoleDefinition,
  StatusIncident,
  SystemStatusSnapshot,
  UserRole,
} from '../types';

const mockQuota: QuotaMetric[] = [
  { label: 'Sends this 24h window', used: 168400, limit: 250000 },
  { label: 'Contact records', used: 214300, limit: 350000 },
  { label: 'API calls (hourly)', used: 3120, limit: 10000 },
];

export const PERMISSIONS: Permission[] = [
  { key: 'campaigns.create', label: 'Create & edit campaigns' },
  { key: 'campaigns.send', label: 'Schedule & send campaigns' },
  { key: 'contacts.manage', label: 'Manage contacts & lists' },
  { key: 'consent.manage', label: 'Manage consent & preferences' },
  { key: 'reports.export', label: 'Export reports & analytics' },
  { key: 'users.manage', label: 'Manage users & roles' },
  { key: 'audit.view', label: 'View audit log' },
];

const mockRoles: RoleDefinition[] = [
  { role: 'admin', label: 'Administrator', permissions: { 'campaigns.create': true, 'campaigns.send': true, 'contacts.manage': true, 'consent.manage': true, 'reports.export': true, 'users.manage': true, 'audit.view': true } },
  { role: 'campaign_manager', label: 'Campaign Manager', permissions: { 'campaigns.create': true, 'campaigns.send': true, 'contacts.manage': true, 'consent.manage': true, 'reports.export': true, 'users.manage': false, 'audit.view': false } },
  { role: 'auditor', label: 'Auditor', permissions: { 'campaigns.create': false, 'campaigns.send': false, 'contacts.manage': false, 'consent.manage': false, 'reports.export': true, 'users.manage': false, 'audit.view': true } },
  { role: 'app_integrator', label: 'Application Integrator', permissions: { 'campaigns.create': false, 'campaigns.send': true, 'contacts.manage': false, 'consent.manage': false, 'reports.export': false, 'users.manage': false, 'audit.view': false } },
];

const mockSystemStatus: SystemStatusSnapshot[] = [
  { service: 'Sending service', status: 'operational', detail: 'Queue depth normal, latency within target' },
  { service: 'REST API', status: 'operational', detail: 'p95 response time 180ms' },
  { service: 'Webhook delivery', status: 'degraded', detail: 'Elevated retry rate to one downstream endpoint' },
  { service: 'Contact import', status: 'operational', detail: 'No active jobs' },
];

const mockIncidents: StatusIncident[] = [
  { id: 'i1', title: 'Webhook retries elevated for click events', occurredAt: '2026-08-24T06:10:00+03:00', resolved: false },
  { id: 'i2', title: 'Brief API latency spike during batch send', occurredAt: '2026-08-19T14:02:00+03:00', resolved: true },
];

/** §15 Quota Flow — "Fetch usage"; the frontend only derives a percentage/band. */
export async function getQuota(): Promise<QuotaMetric[]> {
  // TODO: return apiClient.get<QuotaMetric[]>('/admin/quota');
  return mockDelay(mockQuota);
}

// --- User administration: GET/PUT/DELETE /users/list/, GET /all-users/list/,
// POST /invite-user/ (Tmail API, "Users" and "Invitations" folders). No
// example responses were saved in the collection, so RawManagedUser and the
// paginated envelope shape are assumed to mirror the "Update one user"
// request body and the standard DRF `{ count, results }` pagination style
// respectively — confirm against a live response and adjust if they differ.

interface RawManagedUser {
  id: number;
  email: string;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  is_admin?: boolean;
  isAdmin?: boolean;
  company_id?: number | null;
  companyId?: number | null;
  phone?: string | null;
  phone_number?: string | null;
}

interface RawUserPage {
  count?: number;
  total?: number;
  total_count?: number;
  results?: RawManagedUser[];
  data?: RawManagedUser[] | { results?: RawManagedUser[]; count?: number; total?: number };
}

function mapManagedUser(raw: RawManagedUser): ManagedUser {
  const rawFirst = raw.first_name?.trim() || '';
  const rawLast = raw.last_name?.trim() || '';
  const joinedName = [rawFirst, rawLast].filter(Boolean).join(' ').trim();
  const explicitFullName = raw.full_name?.trim() || raw.name?.trim() || joinedName || null;
  const isAdmin = Boolean(raw.is_admin ?? raw.isAdmin);

  return {
    id: raw.id,
    email: raw.email || '',
    username: raw.username || '',
    fullName: explicitFullName,
    isAdmin,
    companyId: raw.company_id ?? raw.companyId ?? null,
    phone: raw.phone || raw.phone_number || null,
    role: roleFromIsAdmin(isAdmin),
  };
}

export interface ListUsersResult {
  users: ManagedUser[];
  total: number;
}

/** GET /all-users/list/?limit=&offset= */
export async function listUsers(limit = 20, offset = 0): Promise<ListUsersResult> {
  const page = await apiClient.get<RawUserPage | RawManagedUser[]>(`/all-users/list/?limit=${limit}&offset=${offset}`);

  let rawList: RawManagedUser[] = [];
  let totalCount: number | undefined;

  if (Array.isArray(page)) {
    rawList = page;
    totalCount = page.length;
  } else if (page && typeof page === 'object') {
    if (Array.isArray(page.results)) {
      rawList = page.results;
    } else if (Array.isArray(page.data)) {
      rawList = page.data;
    } else if (page.data && Array.isArray((page.data as any).results)) {
      rawList = (page.data as any).results;
    }

    totalCount =
      page.count ??
      page.total ??
      page.total_count ??
      (page.data && typeof (page.data as any).count === 'number' ? (page.data as any).count : undefined) ??
      (page.data && typeof (page.data as any).total === 'number' ? (page.data as any).total : undefined);
  }

  const finalTotal = typeof totalCount === 'number' && !isNaN(totalCount) ? totalCount : rawList.length;

  return {
    users: rawList.map(mapManagedUser),
    total: finalTotal,
  };
}

/** GET /users/list/?id= */
export async function getUser(id: number): Promise<ManagedUser> {
  const raw = await apiClient.get<RawManagedUser>(`/users/list/?id=${id}`);
  return mapManagedUser(raw);
}

/** PUT /users/list/ — full-record update; send back the fields that didn't change too. */
export async function updateUser(
  user: Pick<ManagedUser, 'id' | 'email' | 'username' | 'isAdmin' | 'companyId' | 'phone' | 'fullName'>
): Promise<ManagedUser> {
  const raw = await apiClient.put<RawManagedUser>(`/users/list/?id=${user.id}`, {
    id: user.id,
    email: user.email,
    is_admin: user.isAdmin,
    username: user.username,
    company_id: user.companyId,
    phone: user.phone,
    full_name: user.fullName,
  });
  return mapManagedUser(raw);
}
/** DELETE /users/list/?id= */
export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete<void>(`/users/list/?id=${id}`);
}

/** POST /invite-user/. Note: the collection has no "list invitations"
 * endpoint, so a pending invite can't be shown in the Users table — the
 * old mock model's 'pending' status doesn't have a real equivalent here. */
export async function inviteUser(email: string, companyId: number): Promise<void> {
  await apiClient.post<void>('/invite-user/', { email, company_id: companyId });
}

export async function listRoles(): Promise<RoleDefinition[]> {
  // TODO: return apiClient.get<RoleDefinition[]>('/admin/roles');
  return mockDelay(mockRoles);
}

/** §16 "Role administration" — enable/disable permissions, then Save. */
export async function saveRolePermissions(
  role: UserRole,
  permissions: Record<string, boolean>
): Promise<RoleDefinition> {
  // TODO: return apiClient.put<RoleDefinition>(`/admin/roles/${role}`, { permissions });
  const existing = mockRoles.find((r) => r.role === role);
  if (!existing) throw new Error(`Unknown role ${role}`);
  return mockDelay({ ...existing, permissions });
}

/** §21 System Status Flow — read-only platform health, visible to every role. */
export async function getSystemStatus(): Promise<SystemStatusSnapshot[]> {
  // TODO: return apiClient.get<SystemStatusSnapshot[]>('/status');
  return mockDelay(mockSystemStatus);
}

export async function listIncidents(): Promise<StatusIncident[]> {
  // TODO: return apiClient.get<StatusIncident[]>('/status/incidents');
  return mockDelay(mockIncidents);
}
