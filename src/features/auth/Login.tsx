import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

export function Login() {
  const {
    loginMethod,
    setLoginMethod,
    awaitingOtp,
    authError,
    loginWithPassword,
    requestOtp,
    verifyOtp,
    cancelOtp,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (loginMethod === 'password') {
        await loginWithPassword(email, password);
      } else {
        await requestOtp(email, password);
      }
    } catch {
      // authError already set by AuthContext; nothing further to do here.
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOtpSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await verifyOtp(otpCode);
    } catch {
      // authError already set by AuthContext.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <span className="login__brand-mark">NCA</span>
        <h1 className="login__title">Bulk Email Console</h1>
        <p className="login__sub">Ninja Construction Authority — mail.nca.ke</p>

        {!awaitingOtp ? (
          <form onSubmit={handleCredentialsSubmit}>
            <div className="field" role="radiogroup" aria-label="Sign-in method">
              <label htmlFor="login-method">Sign-in method</label>
              <select
                id="login-method"
                value={loginMethod}
                onChange={(e) => setLoginMethod(e.target.value as 'password' | 'otp')}
              >
                <option value="password">Password</option>
                <option value="otp">Email one-time code</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                placeholder="j.wanjiru@nca.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {authError && <p className="login__error">{authError}</p>}
            <button className="btn btn--primary login__submit" type="submit" disabled={submitting}>
              {loginMethod === 'password' ? 'Sign in' : 'Send code'}
            </button>
            <Link
              to="/forgot-password"
              style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 13 }}
            >
              Forgot your password?
            </Link>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className="field">
              <label htmlFor="otp">Enter your 6-digit code</label>
              <input
                id="otp"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>
            {authError && <p className="login__error">{authError}</p>}
            <button className="btn btn--primary login__submit" type="submit" disabled={submitting}>
              Verify &amp; sign in
            </button>
            <button className="btn login__submit" type="button" onClick={cancelOtp} style={{ marginTop: 8 }}>
              Back
            </button>
          </form>
        )}

        {loginMethod === 'otp' && !awaitingOtp && (
          <p className="login__mfa-note">
            We'll email a one-time code to this address after you submit your password.
          </p>
        )}
      </div>
    </div>
  );
}
