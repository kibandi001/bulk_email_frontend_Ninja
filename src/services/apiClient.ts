// The backend bridge. Every other file in services/ goes through here rather
// than calling fetch() directly, so auth headers, error handling and the
// base URL only need to be right in one place.
//
// The platform's REST API is OAuth 2.0 bearer / scoped API key (inception
// report §6.6). Until a backend is connected, individual service functions
// resolve against local mock data via `mockDelay` instead of calling
// `apiClient.*` — swapping one for the other is the whole migration.

import { API_BASE_URL, MOCK_LATENCY_MS } from '../config/constants';

// export class ApiError extends Error {
//   constructor(
//     message: string,
//     public readonly status: number,
//     public readonly body?: unknown
//   ) {
//     super(message);
//     this.name = 'ApiError';
//   }
// }

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;
  constructor(
    message: string,
    status: number,
    body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body
  }
}

let authToken: string | null = null;
let refreshTokenValue: string | null = null;

interface TokenPair {
  access: string;
  refresh: string;
}

// Called by authService after login/OTP verification succeed, and on logout
// (pass null to clear both tokens).
export function setTokens(tokens: TokenPair | null): void {
  authToken = tokens?.access ?? null;
  refreshTokenValue = tokens?.refresh ?? null;
}

// Fired only when a session truly can't be salvaged (no refresh token, or the
// refresh attempt itself failed) so AuthContext can force a re-login without
// every call site needing to know about session state.
const SESSION_EXPIRED_EVENT = 'nca:session-expired';

// De-dupes concurrent refreshes: if several requests 401 around the same
// moment, only one call to /login/ goes out and the rest wait on it.
let refreshInFlight: Promise<TokenPair> | null = null;

async function refreshAccessToken(): Promise<TokenPair> {
  if (!refreshTokenValue) throw new ApiError('No refresh token available', 401);
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshTokenValue }),
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError('Refresh failed', res.status);
        return (await res.json()) as TokenPair;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  const tokens = await refreshInFlight;
  setTokens(tokens);
  return tokens;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const headers = new Headers(options.headers);
  if (!isFormData) headers.set('Content-Type', 'application/json');
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    // Try one silent refresh-and-retry before giving up. Skipped on an
    // already-retried request (avoids infinite loops) and when there's no
    // refresh token to try (e.g. never logged in, or already logged out).
    if (!isRetry && refreshTokenValue) {
      try {
        await refreshAccessToken();
        return request<T>(path, options, true);
      } catch {
        // Refresh itself failed — fall through to the session-expired path below.
      }
    }
    setTokens(null);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError('Session expired', 401);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    throw new ApiError(`Request to ${path} failed`, response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Resolves `value` after a simulated network delay. Used by the mock implementations in the other service files; replace the call site with the matching `apiClient.*` call once a real endpoint exists.
export function mockDelay<T>(value: T, ms: number = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export { SESSION_EXPIRED_EVENT };