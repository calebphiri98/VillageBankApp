import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Ledger from '../components/Ledger.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import StatCard from '../components/StatCard.jsx';
import { money, shortDate, inputDate } from '../utils/format.js';
import './Welfare.css';

const blankPayout = {
  member_id: '', amount: '', category: 'sickness', notes: '',
  date: inputDate(), announce_to_group: true,
};
const blankContribution = { member_id: '', amount: '', date: inputDate(), notes: '' };

export default function Welfare() {
  const { t } = useLang();
  const { isCommittee } = useAuth();
  const toast = useToast();

  const [balance, setBalance] = useState(null);
  const [rows, setRows] = useState(null);
  const [members, setMembers] = useState([]);
  const [mode, setMode] = useState(null);            // 'payout' | 'contribution'
  const [payout, setPayout] = useState(blankPayout);
  const [contribution, setContribution] = useState(blankContribution);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [b, list] = await Promise.all([api.get('/welfare/balance'), api.get('/welfare')]);
    setBalance(b);
    setRows(list);
    if (isCommittee) { try { setMembers(await api.get('/members')); } catch { /* ignore */ } }
  }, [isCommittee]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  async function submitPayout(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/welfare/payout', {
        ...payout, member_id: Number(payout.member_id), amount: Number(payout.amount),
      });
      const told = res.group_notified?.sent || 0;
      toast.success(told ? `${res.message} ${told} other member(s) were told.` : res.message);
      setMode(null);
      setPayout(blankPayout);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitContribution(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/welfare/contribution', {
        ...contribution,
        member_id: contribution.member_id ? Number(contribution.member_id) : null,
        amount: Number(contribution.amount),
      });
      toast.success(res.message);
      setMode(null);
      setContribution(blankContribution);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!rows || !balance) return <Spinner />;

  const columns = [
    { key: 'full_name', label: t('common.name'), render: (r) => r.full_name || <span className="muted">Whole group</span> },
    { key: 'type', label: t('common.status'),
      render: (r) => (
        <span className={r.type === 'contribution' ? 'tag tag--green' : 'tag tag--gold'}>
          {t(`welfare.${r.type}`)}
        </span>
      ) },
    { key: 'category', label: t('welfare.category'), hideOnPhone: true,
      render: (r) => (r.category ? t(`welfare.${r.category}`) : '—') },
    { key: 'amount', label: t('common.amount'), align: 'right', money: true,
      render: (r) => (
        <span className={r.type === 'payout' ? 'money money--neg' : 'money'}>
          {r.type === 'payout' ? '-' : '+'}{money(r.amount)}
        </span>
      ) },
    { key: 'date', label: t('common.date'), render: (r) => shortDate(r.date) },
  ];

  return (
    <div className="welfare">
      <PageHeader
        title={t('welfare.title')}
        subtitle="Money the group keeps aside for sickness, funerals and emergencies."
        action={isCommittee && (
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setMode('contribution')}>
              {t('welfare.contribute')}
            </button>
            <button type="button" className="btn" onClick={() => setMode('payout')}>
              {t('welfare.help')}
            </button>
          </>
        )}
      />

      <div className="page-grid">
        <StatCard label={t('welfare.balance')} value={money(balance.balance)} tone="gold" big />
        <StatCard label={t('welfare.contribution')} value={money(balance.contributions)} tone="green" />
        <StatCard label={t('welfare.payout')} value={money(balance.payouts)} />
      </div>

      <Ledger columns={columns} rows={rows} />

      {/* ---- give help ---- */}
      <Modal
        open={mode === 'payout'}
        title={t('welfare.help')}
        onClose={() => setMode(null)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setMode(null)}>{t('common.cancel')}</button>
            <button type="submit" form="welfare-payout" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form id="welfare-payout" onSubmit={submitPayout} noValidate>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="w-member">{t('savings.member')}</label>
              <select id="w-member" value={payout.member_id}
                onChange={(e) => setPayout((p) => ({ ...p, member_id: e.target.value }))} required>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="w-amount">{t('common.amount')}</label>
              <input id="w-amount" type="number" inputMode="decimal" min="1" step="any"
                value={payout.amount} onChange={(e) => setPayout((p) => ({ ...p, amount: e.target.value }))} required />
              <span className="field-hint">Available: {money(balance.balance)}</span>
            </div>
            <div>
              <label className="field-label" htmlFor="w-date">{t('common.date')}</label>
              <input id="w-date" type="date" value={payout.date}
                onChange={(e) => setPayout((p) => ({ ...p, date: e.target.value }))} />
            </div>
          </div>

          <fieldset className="welfare__cats">
            <legend className="field-label">{t('welfare.category')}</legend>
            <div className="welfare__catBtns">
              {['sickness', 'funeral', 'emergency', 'other'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={payout.category === c ? 'welfare__cat is-on' : 'welfare__cat'}
                  onClick={() => setPayout((p) => ({ ...p, category: c }))}
                  aria-pressed={payout.category === c}
                >
                  {t(`welfare.${c}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="w-notes">{t('common.notes')}</label>
              <textarea id="w-notes" rows={2} value={payout.notes}
                onChange={(e) => setPayout((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          {(payout.category === 'sickness' || payout.category === 'funeral') && (
            <label className="welfare__announce">
              <input type="checkbox" checked={payout.announce_to_group}
                onChange={(e) => setPayout((p) => ({ ...p, announce_to_group: e.target.checked }))} />
              <span>
                <strong>{t('welfare.announce')}</strong>
                <span className="welfare__announceHelp">{t('welfare.announceHelp')}</span>
              </span>
            </label>
          )}
        </form>
      </Modal>

      {/* ---- record a contribution ---- */}
      <Modal
        open={mode === 'contribution'}
        title={t('welfare.contribute')}
        onClose={() => setMode(null)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setMode(null)}>{t('common.cancel')}</button>
            <button type="submit" form="welfare-contrib" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form id="welfare-contrib" onSubmit={submitContribution} noValidate>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="wc-member">
                {t('savings.member')} <span className="muted">({t('common.optional')})</span>
              </label>
              <select id="wc-member" value={contribution.member_id}
                onChange={(e) => setContribution((c) => ({ ...c, member_id: e.target.value }))}>
                <option value="">Whole group collection</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="wc-amount">{t('common.amount')}</label>
              <input id="wc-amount" type="number" inputMode="decimal" min="1" step="any"
                value={contribution.amount}
                onChange={(e) => setContribution((c) => ({ ...c, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="field-label" htmlFor="wc-date">{t('common.date')}</label>
              <input id="wc-date" type="date" value={contribution.date}
                onChange={(e) => setContribution((c) => ({ ...c, date: e.target.value }))} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
