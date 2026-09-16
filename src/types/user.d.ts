// // RBAC identity, roles, and the permission matrix shape.
// // Populated by services/authService.ts and services/adminService.ts (§0.1.1, §16).

// export type UserRole = 'admin' | 'campaign_manager' | 'auditor' | 'app_integrator';

// export interface AuthUser {
//   id: string;
//   name: string;
//   email: string;
//   role: UserRole;
//   mfaVerified: boolean;
// }

// export interface ManagedUser {
//   name: string;
//   email: string;
//   role: UserRole;
//   status: 'granted' | 'pending' | 'disabled';
// }

// export interface Permission {
//   key: string;
//   label: string;
// }

// export interface RoleDefinition {
//   role: UserRole;
//   label: string;
//   permissions: Record<string, boolean>;
// }



// RBAC identity, roles, and the permission matrix shape.
// Populated by services/authService.ts and services/adminService.ts (§0.1.1, §16).

export type UserRole = 'admin' | 'campaign_manager' | 'auditor' | 'app_integrator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mfaVerified: boolean;
}

// Shape returned by GET /users/list/ and GET /all-users/list/ (Tmail API,
// "Users" folder). Distinct from AuthUser: this is the admin-facing record
// for *any* user, not just the signed-in one. The API has no `status` field
// (granted/pending/disabled) — access is entirely controlled by `isAdmin`,
// so that concept from the old mock model doesn't carry over. "Pending"
// state now belongs to Invitations, which is a separate, unlisted resource
// (see companyService.ts / Users.tsx comments).
export interface ManagedUser {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
  companyId: number | null;
  phone: string | null;
  /** Derived, not sent by the API: 'admin' if isAdmin else 'campaign_manager'.
   * See authService.ts's NOTE ON ROLE — auditor/app_integrator aren't
   * representable until a real roles endpoint exists. */
  role: UserRole;
}

export interface Permission {
  key: string;
  label: string;
}

export interface RoleDefinition {
  role: UserRole;
  label: string;
  permissions: Record<string, boolean>;
}
