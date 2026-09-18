import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';
import './Settings.css';

const NUMBERS = ['loan_multiplier', 'default_interest_rate', 'weekly_share_value', 'welfare_contribution'];
const LABELS = {
  loan_multiplier: 'settings.loanMultiplier',
  default_interest_rate: 'settings.interestRate',
  include_interest_in_shareout: 'settings.shareInterest',
  include_fines_in_shareout: 'settings.shareFines',
  include_welfare_in_shareout: 'settings.shareWelfare',
  weekly_share_value: 'settings.shareValue',
  welfare_contribution: 'settings.welfarePerMeeting',
};

/** The rules the group agreed on. Only the chairlady can change them. */
export default function Settings() {
  const { t } = useLang();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [values, setValues] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const rows = await api.get('/settings');
    setValues(Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value])));
  }, []);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/settings', values);
      toast.success(t('settings.saved'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!values) return <Spinner />;

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  return (
    <div className="settings">
      <PageHeader
        title={t('settings.title')}
        subtitle={isAdmin ? undefined : 'Only the chairlady can change these.'}
      />

      <form onSubmit={save} className="settings__form">
        <section className="settings__group">
          <h2 className="settings__h2">{t('loans.title')}</h2>
          {NUMBERS.filter((k) => k in values).map((k) => (
            <div className="settings__row" key={k}>
              <label className="field-label" htmlFor={`set-${k}`}>{t(LABELS[k])}</label>
              <input
                id={`set-${k}`}
                type="number"
                min="0"
                step="any"
                value={values[k]}
                onChange={(e) => set(k, e.target.value)}
                disabled={!isAdmin}
              />
            </div>
          ))}
        </section>

        <section className="settings__group">
          <h2 className="settings__h2">{t('shareout.title')}</h2>
          <p className="settings__note">
            Savings always go back to the woman who saved them. These switches decide
            what else joins the pot that gets split.
          </p>
          {Object.keys(values).filter((k) => k.startsWith('include_')).map((k) => (
            <label className="settings__switch" key={k}>
              <input
                type="checkbox"
                checked={values[k] === 'yes'}
                onChange={(e) => set(k, e.target.checked ? 'yes' : 'no')}
                disabled={!isAdmin}
              />
              <span>{t(LABELS[k] || k)}</span>
            </label>
          ))}
        </section>

        {isAdmin && (
          <button type="submit" className="btn" disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        )}
      </form>
    </div>
  );
}
