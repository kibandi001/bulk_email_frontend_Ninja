import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthError, acceptInvitation } from '../../services/authService';
import './Login.css';

export function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('This invitation link is missing its token. Ask an administrator to resend it.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await acceptInvitation(token, password);
      setDone(true);
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
        <h1 className="login__title">Set up your account</h1>
        <p className="login__sub">Bulk Email Console — mail.nca.ke</p>

        {done ? (
          <>
            <p className="login__sub" style={{ marginTop: 8 }}>
              Your account is ready. You can now sign in with the password you just set.
            </p>
            <Link className="btn btn--primary login__submit" to="/" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
              Go to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="login__sub" style={{ marginTop: 0, marginBottom: 16 }}>
              You've been invited to join the NCA Bulk Email Console. Choose a password to
              activate your account.
            </p>
            <div className="field">
              <label htmlFor="invite-password">Password</label>
              <input
                id="invite-password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="invite-confirm">Confirm password</label>
              <input
                id="invite-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="login__error">{error}</p>}
            <button className="btn btn--primary login__submit" type="submit" disabled={submitting}>
              Activate account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
