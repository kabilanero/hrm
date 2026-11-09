import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Input } from '@/components/ui';
import { useToast } from '@/components/Toast';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.full : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError('Enter your email above first, then click "Forgot password".');
    try {
      const r = await authApi.forgotPassword(email.trim());
      setError('');
      toast.info(r.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.full : 'Request failed');
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} data-testid="login-form">
        <div className="brand"><span className="logo">H</span><span>HRM Console</span></div>
        <h1>Sign in</h1>
        <p className="muted">Use the account created for you by HR or an administrator.</p>
        {error && <div className="alert alert-error" role="alert" data-testid="login-error">{error}</div>}
        <Input label="Email" type="email" name="email" autoComplete="username" value={email} onChange={setEmail} required autoFocus />
        <Input label="Password" type="password" name="password" autoComplete="current-password" value={password} onChange={setPassword} required />
        <button className="btn btn-primary btn-block" disabled={busy} type="submit">{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="auth-links">
          <button type="button" className="link-btn" onClick={forgot}>Forgot password?</button>
          <Link to="/register">Activate my account</Link>
        </div>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      await authApi.register(email.trim(), password);
      toast.success('Account activated. You can sign in now.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.full : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} data-testid="register-form">
        <div className="brand"><span className="logo">H</span><span>HRM Console</span></div>
        <h1>Activate account</h1>
        <p className="muted">Use the work email HR registered for you. Password needs 8+ characters with upper-case, lower-case and a digit.</p>
        {error && <div className="alert alert-error" role="alert" data-testid="register-error">{error}</div>}
        <Input label="Work email" type="email" value={email} onChange={setEmail} required />
        <Input label="Password" type="password" value={password} onChange={setPassword} required autoComplete="new-password" />
        <Input label="Confirm password" type="password" value={confirm} onChange={setConfirm} required autoComplete="new-password" />
        <button className="btn btn-primary btn-block" disabled={busy} type="submit">{busy ? 'Creating…' : 'Activate'}</button>
        <div className="auth-links"><Link to="/login">← Back to sign in</Link></div>
      </form>
    </div>
  );
}
