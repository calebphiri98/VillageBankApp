import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import Spinner from '../components/Spinner.jsx';
import { money, shortDate } from '../utils/format.js';
import './Profile.css';

export default function Profile() {
  const { t } = useLang();
  const { user, refresh, logout } = useAuth();
  const toast = useToast();

  const [record, setRecord] = useState(null);
  const [pass, setPass] = useState({ current_password: '', new_password: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user.member_id) { setRecord({ member: null }); return; }
    api.get('/members/me').then(setRecord).catch(() => setRecord({ member: null }));
  }, [user.member_id]);

  async function changePassword(e) {
    e.preventDefault();
    if (pass.new_password !== pass.confirm) { toast.error(t('forgot.mismatch')); return; }
    if (pass.new_password.length < 6) { toast.error('The new password needs at least 6 characters.'); return; }

    setBusy(true);
    try {
      await api.post('/auth/change-password', {
        current_password: pass.current_password,
        new_password: pass.new_password,
      });
      toast.success('Password changed.');
      setPass({ current_password: '', new_password: '', confirm: '' });
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!record) return <Spinner />;

  const m = record.member;

  return (
    <div className="profile">
      <PageHeader title={t('profile.title')} />

      {user.must_change_password && (
        <p className="notice notice--warn">{t('profile.mustChange')}</p>
      )}

      <section className="profile__card">
        <h2 className="profile__h2">{user.full_name}</h2>
        <dl className="profile__rows">
          <div><dt>{t('login.username')}</dt><dd><code>{user.username}</code></dd></div>
          <div><dt>{t('common.role')}</dt><dd>{t(`roles.${user.role}`)}</dd></div>
          <div><dt>{t('common.phone')}</dt><dd>{user.phone || '—'}</dd></div>
          {m && <div><dt>{t('members.number')}</dt><dd>{m.membership_number}</dd></div>}
          {m && <div><dt>{t('members.joined')}</dt><dd>{shortDate(m.date_joined)}</dd></div>}
          {m && <div><dt>{t('members.savings')}</dt><dd className="money">{money(m.total_savings)}</dd></div>}
        </dl>
      </section>

      <section className="profile__card">
        <h2 className="profile__h2">{t('profile.languagePref')}</h2>
        <LanguageToggle />
        <p className="profile__hint">Your text messages arrive in this language too.</p>
      </section>

      <section className="profile__card">
        <h2 className="profile__h2">{t('profile.changePassword')}</h2>
        <form onSubmit={changePassword} noValidate>
          <div className="profile__field">
            <label className="field-label" htmlFor="p-current">{t('profile.current')}</label>
            <input id="p-current" type="password" autoComplete="current-password"
              value={pass.current_password}
              onChange={(e) => setPass((p) => ({ ...p, current_password: e.target.value }))} required />
          </div>

          <div className="profile__field">
            <label className="field-label" htmlFor="p-new">{t('profile.newPass')}</label>
            <input id="p-new" type="password" autoComplete="new-password"
              value={pass.new_password}
              onChange={(e) => setPass((p) => ({ ...p, new_password: e.target.value }))} required />
          </div>

          <div className="profile__field">
            <label className="field-label" htmlFor="p-confirm">{t('profile.confirm')}</label>
            <input id="p-confirm" type="password" autoComplete="new-password"
              value={pass.confirm}
              onChange={(e) => setPass((p) => ({ ...p, confirm: e.target.value }))} required />
          </div>

          <button type="submit" className="btn" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </section>

      <button type="button" className="btn btn--ghost btn--full" onClick={() => logout()}>
        {t('nav.logout')}
      </button>
    </div>
  );
}
