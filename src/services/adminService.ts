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
  username: string;
  is_admin: boolean;
  company_id: number | null;
  phone: string | null;
}

interface RawUserPage {
  count: number;
  results: RawManagedUser[];
}

function mapManagedUser(raw: RawManagedUser): ManagedUser {
  return {
    id: raw.id,
    email: raw.email,
    username: raw.username,
    isAdmin: raw.is_admin,
    companyId: raw.company_id,
    phone: raw.phone,
    role: roleFromIsAdmin(raw.is_admin),
  };
}

export interface ListUsersResult {
  users: ManagedUser[];
  total: number;
}

/** GET /all-users/list/?limit=&offset= */
export async function listUsers(limit = 20, offset = 0): Promise<ListUsersResult> {
  const page = await apiClient.get<RawUserPage>(`/all-users/list/?limit=${limit}&offset=${offset}`);
  return { users: page.results.map(mapManagedUser), total: page.count };
}

/** GET /users/list/?id= */
export async function getUser(id: number): Promise<ManagedUser> {
  const raw = await apiClient.get<RawManagedUser>(`/users/list/?id=${id}`);
  return mapManagedUser(raw);
}

/** PUT /users/list/ — full-record update; send back the fields that didn't change too. */
export async function updateUser(
  user: Pick<ManagedUser, 'id' | 'email' | 'username' | 'isAdmin' | 'companyId' | 'phone'>
): Promise<ManagedUser> {
  const raw = await apiClient.put<RawManagedUser>('/users/list/', {
    id: user.id,
    email: user.email,
    is_admin: user.isAdmin,
    username: user.username,
    company_id: user.companyId,
    phone: user.phone,
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
