// Application-wide configuration values. Anything that would otherwise be a
// magic number/string scattered across services or features belongs here.

/** Base URL of the live TMail REST API. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

/** Quota usage bands the frontend renders (§15). The platform is the source
 * of truth for alerting; these thresholds only drive local badge/bar colour. */
export const QUOTA_THRESHOLDS = {
  WARNING: 80,
  CRITICAL: 90,
  LIMIT: 100,
} as const;

/** Inactivity timeout before a session is invalidated and the user is
 * returned to Login (§1 "Session expiry"). */
export const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/** Locale used for all date/number formatting across the console. */
export const LOCALE = 'en-KE';


/** Simulated delay retained for service functions that still use local mock data. */
<<<<<<< HEAD
export const MOCK_LATENCY_MS = 0;


//
export const SUBSCRIBERS_WS_URL: string =
  import.meta.env.VITE_SUBSCRIBERS_WS_URL ??
  (API_BASE_URL ? API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/?$/, '') + '/ws/subscribers/' : '');
=======
// export const MOCK_LATENCY_MS = 250;
>>>>>>> 0d0efb3a4b0cd793e03b7dae33783449ca11a662
