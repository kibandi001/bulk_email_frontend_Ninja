import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthError, requestPasswordReset } from '../../services/authService';
import './Login.css';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <span className="login__brand-mark">NCA</span>
        <h1 className="login__title">Reset your password</h1>
        <p className="login__sub">Bulk Email Console — mail.nca.ke</p>

        {sent ? (
          <>
            <p className="login__sub" style={{ marginTop: 8 }}>
              If an account exists for <strong>{email}</strong>, we've sent instructions to reset
              the password. Check your inbox and follow the link there.
            </p>
            <Link className="btn login__submit" to="/" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
              Back to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="reset-email">Work email</label>
              <input
                id="reset-email"
                type="email"
                placeholder="j.wanjiru@nca.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="login__error">{error}</p>}
            <button className="btn btn--primary login__submit" type="submit" disabled={submitting}>
              Send reset link
            </button>
            <Link className="btn login__submit" to="/" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
