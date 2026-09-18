import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  const { login, user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) navigate(location.state?.from || '/app', { replace: true });
  }, [user, navigate, location.state]);

  // Count the lockout down on screen so she knows when to try again.
  useEffect(() => {
    if (lockSeconds <= 0) return undefined;
    const id = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lockSeconds]);

  const locked = lockSeconds > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy || locked) return;

    setError('');
    setAttemptsLeft(null);
    setBusy(true);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message);
      if (err.data?.locked) setLockSeconds(err.data.seconds_remaining || 300);
      else if (typeof err.data?.attempts_remaining === 'number') setAttemptsLeft(err.data.attempts_remaining);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  const mins = Math.floor(lockSeconds / 60);
  const secs = String(lockSeconds % 60).padStart(2, '0');

  return (
    <main className="login">
      <div className="login__panel">
        <div className="login__top">
          <Link to="/" className="login__brand">
            <span className="login__mark" aria-hidden="true">VB</span>
            {t('app.name')}
          </Link>
          <LanguageToggle compact />
        </div>

        <h1 className="login__title">{t('login.title')}</h1>
        <p className="login__sub">{t('login.subtitle')}</p>

        {error && (
          <p className={locked ? 'login__alert login__alert--locked' : 'login__alert'} role="alert">
            {error}
            {locked && <span className="login__countdown">{mins}:{secs}</span>}
          </p>
        )}

        {attemptsLeft !== null && attemptsLeft > 0 && (
          <p className="login__warn" role="status">{t('login.attemptsLeft', attemptsLeft)}</p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="login__field">
            <label className="field-label" htmlFor="username">{t('login.username')}</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={busy || locked}
              required
            />
          </div>

          <div className="login__field">
            <label className="field-label" htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy || locked}
              required
            />
          </div>

          <button type="submit" className="btn btn--full" disabled={busy || locked}>
            {busy ? t('common.loading') : t('login.submit')}
          </button>
        </form>

        <div className="login__links">
          <Link to="/forgot-password">{t('login.forgot')}</Link>
          <span className="login__join">
            {t('login.joinPrompt')} <Link to="/#join">{t('login.joinLink')}</Link>
          </span>
        </div>
      </div>
    </main>
  );
}
