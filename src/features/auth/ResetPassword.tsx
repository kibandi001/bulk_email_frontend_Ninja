import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthError, setNewPassword } from '../../services/authService';
import './Login.css';

export function ResetPassword() {
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
      setError('This reset link is missing its token. Request a new one.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await setNewPassword(token, password);
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
        <h1 className="login__title">Choose a new password</h1>
        <p className="login__sub">Bulk Email Console — mail.nca.ke</p>

        {done ? (
          <>
            <p className="login__sub" style={{ marginTop: 8 }}>
              Your password has been updated. You can now sign in.
            </p>
            <Link className="btn btn--primary login__submit" to="/" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
              Go to sign in
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="login__error">{error}</p>}
            <button className="btn btn--primary login__submit" type="submit" disabled={submitting}>
              Set new password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
