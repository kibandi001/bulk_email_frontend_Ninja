import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { SESSION_EXPIRED_EVENT } from '../services/apiClient';

import {
  AuthError,
  invalidateSession,
  isSessionValid,
  loginWithPassword as loginWithPasswordRequest,
  refreshSession,
  requestOtp as requestOtpRequest,
  verifyOtp as verifyOtpRequest,
} from '../services/authService';

import { SESSION_TIMEOUT_MS } from '../config/constants';
import type { AuthUser, UserRole } from '../types';

export type LoginMethod = 'password' | 'otp';

interface AuthContextValue {
  user: AuthUser | null;

  /**
   * True while the application is checking whether an existing
   * session can be restored.
   */
  loading: boolean;

  /** Which login flow the person on the Login screen has selected. */
  loginMethod: LoginMethod;
  setLoginMethod: (method: LoginMethod) => void;

  /** True once an OTP has been requested and we're waiting on the code. */
  awaitingOtp: boolean;

  authError: string | null;

  loginWithPassword: (email: string, password: string) => Promise<void>;
  requestOtp: (email: string, password: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;

  cancelOtp: () => void;
  logout: () => void;

  hasRole: (...roles: UserRole[]) => boolean;

  sessionExpiresInMs: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  /**
   * IMPORTANT:
   * Start as true so App.tsx does not immediately assume the user
   * is logged out while /me/ is being checked.
   */
  const [loading, setLoading] = useState(true);

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    setExpiresAt(Date.now() + SESSION_TIMEOUT_MS);
  }, []);

  const logout = useCallback(() => {
    invalidateSession();
    setUser(null);
    setPendingUserId(null);
    setExpiresAt(0);
  }, []);

  /**
   * Restore an existing authenticated session when the application
   * starts or when the browser is opened directly on a route.
   *
   * This is what prevents:
   *
   *   /campaign
   *
   * from being treated as a logout just because "user" initially
   * starts as null.
   */
  useEffect(() => {
    let cancelled = false;

    const restoreExistingSession = async () => {
      try {
        const restoredUser = await refreshSession();

        if (cancelled) return;

        setUser(restoredUser);
        resetTimer();
      } catch {
        if (cancelled) return;

        setUser(null);
        setExpiresAt(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    restoreExistingSession();

    return () => {
      cancelled = true;
    };
  }, [resetTimer]);

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);

      try {
        const authUser = await loginWithPasswordRequest(email, password);

        setUser(authUser);
        resetTimer();
      } catch (err) {
        setAuthError(
          err instanceof AuthError
            ? err.message
            : 'Unable to sign in. Please try again.'
        );

        throw err;
      }
    },
    [resetTimer]
  );

  const requestOtp = useCallback(
    async (email: string, password: string) => {
      setAuthError(null);

      try {
        const { userId } = await requestOtpRequest(email, password);
        setPendingUserId(userId);
      } catch (err) {
        setAuthError(
          err instanceof AuthError
            ? err.message
            : 'Unable to sign in. Please try again.'
        );

        throw err;
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (code: string) => {
      if (pendingUserId == null) return;

      setAuthError(null);

      try {
        const authUser = await verifyOtpRequest(pendingUserId, code);

        setUser(authUser);
        setPendingUserId(null);
        resetTimer();
      } catch (err) {
        setAuthError(
          err instanceof AuthError
            ? err.message
            : 'Verification failed. Please try again.'
        );

        throw err;
      }
    },
    [pendingUserId, resetTimer]
  );

  const cancelOtp = useCallback(() => {
    setPendingUserId(null);
    setAuthError(null);
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) =>
      !!user && roles.includes(user.role),
    [user]
  );

  /**
   * Reset inactivity timeout when the user interacts with the app.
   */
  useEffect(() => {
    if (!user) return;

    const activityEvents: (keyof WindowEventMap)[] = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];

    const onActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, onActivity);
    });

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, onActivity);
      });
    };
  }, [user, resetTimer]);

  /**
   * Session inactivity timer.
   */
  useEffect(() => {
    if (!user) return;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      if (!isSessionValid(expiresAt)) {
        logout();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [user, expiresAt, logout]);

  /**
   * Any API request that triggers the global session-expired event
   * logs the user out normally.
   */
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, logout);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
    };
  }, [logout]);

  const sessionExpiresInMs = user
    ? Math.max(0, expiresAt - Date.now())
    : 0;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,

        loginMethod,
        setLoginMethod,

        awaitingOtp: pendingUserId != null,

        authError,

        loginWithPassword,
        requestOtp,
        verifyOtp,

        cancelOtp,
        logout,

        hasRole,

        sessionExpiresInMs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}