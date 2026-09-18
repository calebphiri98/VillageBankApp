import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import './ForgotPassword.css';

/** Two steps: ask for a code by SMS, then use it to set a new password. */
export default function ForgotPassword() {
  const { t } = useLang();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [hint, setHint] = useState('');
  const [code, setCode] = useState('');
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function requestCode(e) {
    e?.preventDefault();
    if (!username.trim()) return;
    setBusy(true); setError('');
    try {
      const res = await api.post('/auth/forgot', { username: username.trim() }, { auth: false });
      setHint(res.phone_hint || '');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(e) {
    e.preventDefault();
    setError('');
    if (pass1 !== pass2) { setError(t('forgot.mismatch')); return; }
    if (pass1.length < 6) { setError('The new password needs at least 6 characters.'); return; }

    setBusy(true);
    try {
      await api.post('/auth/reset',
        { username: username.trim(), code: code.trim(), new_password: pass1 }, { auth: false });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="forgot">
      <div className="forgot__panel">
        <div className="forgot__top">
          <Link to="/login" className="forgot__back">&larr; {t('forgot.backToLogin')}</Link>
          <LanguageToggle compact />
        </div>

        <h1 className="forgot__title">{t('forgot.title')}</h1>

        {done ? (
          <div className="forgot__done">
            <p className="notice notice--good">Password changed. You can log in now.</p>
            <Link to="/login" className="btn btn--full">{t('login.submit')}</Link>
          </div>
        ) : (
          <>
            <ol className="forgot__steps" aria-label="Steps">
              <li className={step === 1 ? 'is-on' : 'is-done'}>1</li>
              <li className={step === 2 ? 'is-on' : ''}>2</li>
            </ol>

            {error && <p className="notice notice--danger" role="alert">{error}</p>}

            {step === 1 ? (
              <form onSubmit={requestCode} noValidate>
                <p className="forgot__lead">{t('forgot.step1')}</p>
                <div className="forgot__field">
                  <label className="field-label" htmlFor="fusername">{t('login.username')}</label>
                  <input
                    id="fusername"
                    autoCapitalize="none"
                    spellCheck="false"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={busy}
                    required
                  />
                </div>
                <button type="submit" className="btn btn--full" disabled={busy || !username.trim()}>
                  {busy ? t('common.sending') : t('forgot.sendCode')}
                </button>
              </form>
            ) : (
              <form onSubmit={submitNewPassword} noValidate>
                <p className="forgot__lead">{t('forgot.step2')}</p>
                {hint && <p className="forgot__hint">Sent to {hint}</p>}

                <div className="forgot__field">
                  <label className="field-label" htmlFor="code">{t('forgot.code')}</label>
                  <input
                    id="code"
                    className="forgot__code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    disabled={busy}
                    required
                  />
                </div>

                <div className="forgot__field">
                  <label className="field-label" htmlFor="p1">{t('forgot.newPassword')}</label>
                  <input id="p1" type="password" autoComplete="new-password"
                    value={pass1} onChange={(e) => setPass1(e.target.value)} disabled={busy} required />
                </div>

                <div className="forgot__field">
                  <label className="field-label" htmlFor="p2">{t('forgot.confirmPassword')}</label>
                  <input id="p2" type="password" autoComplete="new-password"
                    value={pass2} onChange={(e) => setPass2(e.target.value)} disabled={busy} required />
                </div>

                <button type="submit" className="btn btn--full" disabled={busy}>
                  {busy ? t('common.saving') : t('forgot.submit')}
                </button>

                <button type="button" className="forgot__resend" onClick={requestCode} disabled={busy}>
                  {t('forgot.resend')}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
