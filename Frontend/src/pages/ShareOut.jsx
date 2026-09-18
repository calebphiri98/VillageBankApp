import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Ledger from '../components/Ledger.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { money, shortDate } from '../utils/format.js';
import './ShareOut.css';

/**
 * The end of the year: work out what everyone is owed, check it, then
 * hand it out — which texts each woman her own figure.
 */
export default function ShareOut() {
  const { t } = useLang();
  const { user, isCommittee } = useAuth();
  const toast = useToast();

  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [mine, setMine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const canRun = ['admin', 'treasurer'].includes(user.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isCommittee) {
        const [p, h] = await Promise.all([
          api.get('/shareout/preview').catch(() => null),
          api.get('/shareout').catch(() => []),
        ]);
        setPreview(p);
        setHistory(h);
      }
      setMine(await api.get('/shareout/mine').catch(() => null));
    } finally {
      setLoading(false);
    }
  }, [isCommittee]);

  useEffect(() => { load(); }, [load]);

  async function calculate() {
    setBusy(true);
    try {
      const res = await api.post('/shareout');
      toast.success(t('shareout.draftSaved'));
      setHistory(await api.get('/shareout'));
      setPreview({ ...preview, ...res });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function distribute(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('shareout.confirmDistribute'))) return;
    setBusy(true);
    try {
      const res = await api.post(`/shareout/${id}/distribute`);
      toast.success(res.message);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;

  // ---- what a plain member sees ----
  if (!isCommittee) {
    return (
      <div className="shareout">
        <PageHeader title={t('shareout.title')} />
        {mine ? (
          <div className="shareout__mine">
            <p className="shareout__mineLabel">
              {mine.status === 'distributed' ? t('dashboard.shareReady') : t('dashboard.myShare')}
            </p>
            <p className="shareout__mineAmount money">{money(mine.share_amount)}</p>
            <dl className="shareout__mineRows">
              <div><dt>{t('shareout.savedByMembers')}</dt><dd className="money">{money(mine.member_savings)}</dd></div>
              <div><dt>{t('shareout.profitShare')}</dt><dd className="money">{money(mine.profit_share)}</dd></div>
              {mine.deductions > 0 && (
                <div><dt>{t('shareout.deductions')}</dt><dd className="money money--neg">-{money(mine.deductions)}</dd></div>
              )}
            </dl>
            {mine.date_distributed && (
              <p className="muted">{shortDate(mine.date_distributed)} — {mine.cycle_name}</p>
            )}
          </div>
        ) : (
          <EmptyState title={t('shareout.empty')} body="Your share is worked out at the end of the cycle." />
        )}
      </div>
    );
  }

  // ---- committee view ----
  const b = preview?.breakdown;
  const draft = history.find((h) => h.status === 'draft');

  const columns = [
    { key: 'full_name', label: t('common.name') },
    { key: 'member_savings', label: t('shareout.savedByMembers'), align: 'right', money: true,
      render: (r) => money(r.member_savings) },
    { key: 'profit_share', label: t('shareout.profitShare'), align: 'right', money: true, hideOnPhone: true,
      render: (r) => money(r.profit_share) },
    { key: 'deductions', label: t('shareout.deductions'), align: 'right', money: true, hideOnPhone: true,
      render: (r) => (r.deductions > 0 ? <span className="money money--neg">-{money(r.deductions)}</span> : '—') },
    { key: 'share_amount', label: t('shareout.share'), align: 'right', money: true,
      render: (r) => <strong className="money">{money(r.share_amount)}</strong> },
  ];

  return (
    <div className="shareout">
      <PageHeader
        title={t('shareout.title')}
        subtitle={preview?.cycle?.cycle_name}
        action={canRun && !draft && preview && (
          <button type="button" className="btn" onClick={calculate} disabled={busy}>
            {t('shareout.calculate')}
          </button>
        )}
      />

      {!preview && <EmptyState title="No saving cycle is running." />}

      {preview?.open_loans > 0 && (
        <p className="notice notice--warn">{t('shareout.openLoans', preview.open_loans)}</p>
      )}

      {b && (
        <section className="shareout__breakdown">
          <h2 className="shareout__h2">{t('shareout.breakdown')}</h2>
          <dl className="shareout__rows">
            <div>
              <dt>{t('shareout.savedByMembers')}</dt>
              <dd className="money">{money(b.total_savings)}</dd>
            </div>
            <div className={preview.settings.include_interest_in_shareout === 'yes' ? '' : 'is-excluded'}>
              <dt>
                {t('shareout.interestCollected')}
                {preview.settings.include_interest_in_shareout !== 'yes' && (
                  <span className="shareout__excluded">{t('shareout.notShared')}</span>
                )}
              </dt>
              <dd className="money">{money(b.interest_collected)}</dd>
            </div>
            <div className={preview.settings.include_fines_in_shareout === 'yes' ? '' : 'is-excluded'}>
              <dt>
                {t('shareout.finesCollected')}
                {preview.settings.include_fines_in_shareout !== 'yes' && (
                  <span className="shareout__excluded">{t('shareout.notShared')}</span>
                )}
              </dt>
              <dd className="money">{money(b.fines_collected)}</dd>
            </div>
            <div className={preview.settings.include_welfare_in_shareout === 'yes' ? '' : 'is-excluded'}>
              <dt>
                {t('shareout.welfareLeft')}
                {preview.settings.include_welfare_in_shareout !== 'yes' && (
                  <span className="shareout__excluded">{t('shareout.notShared')}</span>
                )}
              </dt>
              <dd className="money">{money(b.welfare_balance)}</dd>
            </div>
            <div className="is-total">
              <dt>{t('shareout.totalFund')}</dt>
              <dd className="money">{money(b.total_fund)}</dd>
            </div>
          </dl>
        </section>
      )}

      {draft && canRun && (
        <div className="shareout__draft">
          <p>{t('shareout.draftSaved')}</p>
          <button type="button" className="btn btn--gold" onClick={() => distribute(draft.id)} disabled={busy}>
            {busy ? t('common.sending') : t('shareout.distribute')}
          </button>
        </div>
      )}

      {preview?.shares?.length > 0 && (
        <>
          <h2 className="shareout__h2">{t('shareout.perMember')}</h2>
          <Ledger columns={columns} rows={preview.shares} keyField="member_id" />
        </>
      )}

      {history.length > 0 && (
        <section className="shareout__history">
          <h2 className="shareout__h2">{t('common.total')}</h2>
          <ul className="shareout__historyList">
            {history.map((h) => (
              <li key={h.id}>
                <span>{h.cycle_name || `#${h.id}`}</span>
                <span className={h.status === 'distributed' ? 'tag tag--green' : 'tag tag--gold'}>
                  {h.status === 'distributed' ? shortDate(h.date_distributed) : 'draft'}
                </span>
                <span className="money">{money(h.total_fund)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
