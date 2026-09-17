// Login (password or OTP), token refresh, and session teardown against the
// Tmail Django API (see "Tmail API" Postman collection — Authentication and
// Current User folders).
//
// The API exposes two independent login flows and gives no signal ahead of
// time about which a given account requires, so the person signing in picks:
//   - Password: POST /token/            { email, password } -> tokens
//   - OTP:      POST /login/otp/        { email, password } -> requests a code
//               POST /login/verify-otp/ { user_id, otp }     -> tokens
//
// ASSUMPTIONS (no example responses were saved in the collection — confirm
// against a live server and adjust the Raw* interfaces below if they differ):
//   - Token responses look like { access, refresh } (standard SimpleJWT shape).
//   - POST /login/otp/ returns the account's numeric id as `user_id`, since
//     that's the field POST /login/verify-otp/ expects back.
//   - GET /me/ returns id/email/username/is_admin/company_id/phone, mirroring
//     the fields used in the collection's "Update one user" request body.
//
// NOTE ON ROLE: this API only exposes an `is_admin` boolean, not the four-way
// UserRole (admin / campaign_manager / auditor / app_integrator) the rest of
// this app's RBAC assumes. Until a real roles endpoint exists, is_admin=true
// maps to 'admin' and everyone else maps to 'campaign_manager' as a
// placeholder — auditor/app_integrator can't be derived from this API alone.
//
// NOTE ON REFRESH: apiClient.ts now handles token refresh centrally — any
// request that comes back 401 is silently retried once after a refresh via
// POST /login/ (the collection's /token/refresh/ entry sends an
// email/password body rather than a refresh token, which looks like a
// copy/paste artifact rather than a real endpoint, so it's not used).
// refreshSession() below is just a manual trigger for that same mechanism,
// kept in case some call site wants to force-validate a session explicitly.

import { apiClient, setTokens } from './apiClient';
import type { AuthUser } from '../types';

export class AuthError extends Error {}

interface TokenPair {
  access: string;
  refresh: string;
}

interface RawUser {
  id: number;
  email: string;
  username: string;
  is_admin: boolean;
  company_id?: number | null;
  phone?: string | null;
}

/** Shared with adminService.ts, which maps ManagedUser records the same way. */
export function roleFromIsAdmin(isAdmin: boolean): AuthUser['role'] {
  return isAdmin ? 'admin' : 'admin';
}

function mapUser(raw: RawUser): AuthUser {
  return {
    id: String(raw.id),
    name: raw.username,
    email: raw.email,
    role: roleFromIsAdmin(raw.is_admin),
    mfaVerified: true, // reaching this point means whichever login flow was used already completed.
  };
}

async function fetchCurrentUser(): Promise<AuthUser> {
  const raw = await apiClient.get<RawUser>('/me/');
  console.log('[DEBUG authService] raw /me/ response:', raw);
  const mapped = mapUser(raw);
  console.log('[DEBUG authService] mapped AuthUser:', mapped);
  return mapped;
}

/** Password flow, single step: POST /token/. */
export async function loginWithPassword(email: string, password: string): Promise<AuthUser> {
  if (!email.trim() || !password.trim()) {
    throw new AuthError('Enter your work email and password to continue.');
  }
  let tokens: TokenPair;
  try {
    tokens = await apiClient.post<TokenPair>('/token/', { email, password });
  } catch {
    throw new AuthError('Invalid email or password.');
  }
  setTokens(tokens);
  return fetchCurrentUser();
}

/** OTP flow, step 1: request a code. Returns the id needed for step 2. */
export async function requestOtp(email: string, password: string): Promise<{ userId: number }> {
  if (!email.trim() || !password.trim()) {
    throw new AuthError('Enter your work email and password to continue.');
  }
  try {
    const res = await apiClient.post<{ user_id: number }>('/login/otp/', { email, password });
    return { userId: res.user_id };
  } catch {
    throw new AuthError('Invalid email or password.');
  }
}

/** OTP flow, step 2: verify the code and obtain tokens. */
export async function verifyOtp(userId: number, otp: string): Promise<AuthUser> {
  if (!/^\d{6}$/.test(otp)) {
    throw new AuthError('Enter the 6-digit code sent to your registered device.');
  }
  let tokens: TokenPair;
  try {
    tokens = await apiClient.post<TokenPair>('/login/verify-otp/', { user_id: userId, otp });
  } catch {
    throw new AuthError('That code is incorrect or has expired.');
  }
  setTokens(tokens);
  return fetchCurrentUser();
}

/** Manual session re-validation. apiClient already retries a 401 with a
 * fresh access token automatically (see NOTE ON REFRESH above); this just
 * re-fetches /me/, which triggers that same mechanism if the access token
 * has actually expired. */
export async function refreshSession(): Promise<AuthUser> {
  return fetchCurrentUser();
}

export function invalidateSession(): void {
  setTokens(null);
}

/** Password Reset, step 1: POST /password-reset-request/. Unauthenticated
 * (noauth) per the collection. Always resolves — the API shouldn't reveal
 * whether an address exists, so the UI shows the same confirmation either
 * way. */
export async function requestPasswordReset(email: string): Promise<void> {
  if (!email.trim()) throw new AuthError('Enter your work email to continue.');
  await apiClient.post<void>('/password-reset-request/', { email: email.trim() });
}

/** Password Reset, step 2: POST /password-reset/:token/. Unauthenticated. */
export async function setNewPassword(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new AuthError('Choose a password with at least 8 characters.');
  }
  try {
    await apiClient.post<void>(`/password-reset/${encodeURIComponent(token)}/`, {
      new_password: newPassword,
    });
  } catch {
    throw new AuthError('This reset link is invalid or has expired. Request a new one.');
  }
}

/** Invitations, accept step: POST /accept-invitation/:token/. Unauthenticated
 * (noauth) per the collection — the token itself is the credential. The
 * "Invite a user" step (adminService.inviteUser) is what creates this link;
 * there's no "list invitations" endpoint, so a pending invite only becomes
 * visible once accepted and the account shows up in /all-users/list/. */
export async function acceptInvitation(token: string, password: string): Promise<void> {
  if (password.length < 8) {
    throw new AuthError('Choose a password with at least 8 characters.');
  }
  try {
    await apiClient.post<void>(`/accept-invitation/${encodeURIComponent(token)}/`, { password });
  } catch {
    throw new AuthError('This invitation link is invalid or has expired. Ask an administrator to resend it.');
  }
}

/** Kept for compatibility with the session-timeout UI in AuthContext. */
export function isSessionValid(expiresAt: number): boolean {
  return Date.now() < expiresAt;
}
