import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { plainNumber } from '../utils/format.js';
import './Home.css';

export default function Home() {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ full_name: '', phone: '', village: '', reason: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/public/impact', { auth: false }).then(setStats).catch(() => setStats(null));
  }, []);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.post('/join-requests', form, { auth: false });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // The cycle clock is the most characteristic thing about a village bank:
  // one year, filling up week by week, then the box is opened.
  const weeks = stats?.weeks_total || 52;
  const done = stats?.weeks_elapsed || 0;

  return (
    <div className="home">
      <header className="home__bar">
        <span className="home__brand">
          <span className="home__mark" aria-hidden="true">VB</span>
          {t('app.name')}
        </span>
        <div className="home__baractions">
          <LanguageToggle compact />
          <Link to="/login" className="btn btn--small">{t('home.login')}</Link>
        </div>
      </header>

      <section className="home__hero">
        <div className="home__heroText">
          <h1 className="home__title">{t('home.heroTitle')}</h1>
          <p className="home__lead">{t('home.heroBody')}</p>
          <div className="home__cta">
            <a href="#join" className="btn btn--gold">{t('home.join')}</a>
            <Link to="/login" className="btn btn--ghost">{t('home.login')}</Link>
          </div>
        </div>

        <div className="home__clock" aria-hidden="true">
          <div className="home__weeks">
            {Array.from({ length: weeks }, (_, i) => (
              <span key={i} className={i < done ? 'home__week is-filled' : 'home__week'} />
            ))}
          </div>
          <p className="home__clockLabel">
            <strong>{done}</strong> of {weeks} weeks
            {stats?.cycle_name ? ` — ${stats.cycle_name}` : ''}
          </p>
        </div>
      </section>

      {stats && (
        <section className="home__stats">
          <div className="home__stat">
            <span className="home__statNum">{plainNumber(stats.active_members)}</span>
            <span className="home__statLabel">{t('home.statMembers')}</span>
          </div>
          <div className="home__stat">
            <span className="home__statNum">{plainNumber(stats.loans_given)}</span>
            <span className="home__statLabel">{t('home.statLoans')}</span>
          </div>
          <div className="home__stat">
            <span className="home__statNum">{stats.recovery_rate}%</span>
            <span className="home__statLabel">{t('home.statRepaid')}</span>
          </div>
          <div className="home__stat">
            <span className="home__statNum">{plainNumber(stats.meetings_held)}</span>
            <span className="home__statLabel">{t('home.statMeetings')}</span>
          </div>
        </section>
      )}

      <section className="home__how">
        <h2 className="home__h2">{t('home.howTitle')}</h2>
        {/* The year really is a sequence, so numbering it is honest here. */}
        <ol className="home__steps">
          <li>
            <h3>{t('home.step1Title')}</h3>
            <p>{t('home.step1Body')}</p>
          </li>
          <li>
            <h3>{t('home.step2Title')}</h3>
            <p>{t('home.step2Body')}</p>
          </li>
          <li>
            <h3>{t('home.step3Title')}</h3>
            <p>{t('home.step3Body')}</p>
          </li>
        </ol>
      </section>

      <section className="home__join" id="join">
        <div className="home__joinInner">
          <h2 className="home__h2">{t('home.joinTitle')}</h2>
          <p className="home__joinLead">{t('home.joinBody')}</p>

          {sent ? (
            <p className="notice notice--good">{t('home.joinDone')}</p>
          ) : (
            <form onSubmit={submit} className="home__form" noValidate>
              {error && <p className="notice notice--danger" role="alert">{error}</p>}

              <div className="home__field">
                <label className="field-label" htmlFor="jname">{t('home.joinName')}</label>
                <input id="jname" value={form.full_name} onChange={change('full_name')} required disabled={busy} />
              </div>

              <div className="home__field">
                <label className="field-label" htmlFor="jphone">{t('home.joinPhone')}</label>
                <input id="jphone" type="tel" inputMode="tel" placeholder="0995727978"
                  value={form.phone} onChange={change('phone')} required disabled={busy} />
                <span className="field-hint">We will text you when the group decides.</span>
              </div>

              <div className="home__field">
                <label className="field-label" htmlFor="jvillage">{t('home.joinVillage')}</label>
                <input id="jvillage" value={form.village} onChange={change('village')} disabled={busy} />
              </div>

              <div className="home__field">
                <label className="field-label" htmlFor="jreason">{t('home.joinReason')}</label>
                <textarea id="jreason" rows={3} value={form.reason} onChange={change('reason')} disabled={busy} />
              </div>

              <button type="submit" className="btn btn--full" disabled={busy}>
                {busy ? t('common.sending') : t('home.joinSubmit')}
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="home__footer">
        <p>{t('app.name')} — {t('app.tagline')}</p>
      </footer>
    </div>
  );
}
