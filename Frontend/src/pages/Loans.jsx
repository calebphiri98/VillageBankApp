import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Ledger from '../components/Ledger.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { money, shortDate, inputDate } from '../utils/format.js';
import './Loans.css';

const STATUS_TAG = {
  pending: 'gold', approved: 'green', rejected: 'grey', repaid: 'blue', defaulted: 'red',
};

const blankApply = { member_id: '', amount: '', with_interest: true, purpose: '', due_date: '' };

export default function Loans() {
  const { t } = useLang();
  const { user, isCommittee } = useAuth();
  const toast = useToast();

  const [loans, setLoans] = useState(null);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState(blankApply);
  const [busy, setBusy] = useState(false);

  const [detail, setDetail] = useState(null);       // { loan, repayments }
  const [decisionNote, setDecisionNote] = useState('');
  const [repayAmount, setRepayAmount] = useState('');

  const canDecide = ['admin', 'treasurer', 'secretary'].includes(user.role);
  const canRecordRepayment = ['admin', 'treasurer'].includes(user.role);

  const load = useCallback(async () => {
    const list = await api.get('/loans');
    setLoans(list);
    if (isCommittee) {
      try { setMembers(await api.get('/members')); } catch { /* not fatal */ }
    }
  }, [isCommittee]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  const change = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function apply(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        amount: Number(form.amount),
        with_interest: form.with_interest,
        purpose: form.purpose || null,
        due_date: form.due_date || null,
      };
      if (isCommittee && form.member_id) body.member_id = Number(form.member_id);
      const res = await api.post('/loans', body);
      toast.success(res.message);
      setApplyOpen(false);
      setForm(blankApply);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(row) {
    try {
      setDetail(await api.get(`/loans/${row.id}`));
      setDecisionNote('');
      setRepayAmount('');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function decide(status) {
    if (!detail) return;
    if (status === 'rejected' && !decisionNote.trim()) {
      toast.error('Give a reason. The borrower will see it in her text message.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.patch(`/loans/${detail.loan.id}/decision`, { status, note: decisionNote || null });
      toast.success(res.message);
      setDetail(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function recordRepayment(e) {
    e.preventDefault();
    if (!repayAmount) return;
    setBusy(true);
    try {
      const res = await api.post(`/loans/${detail.loan.id}/repayments`, { amount: Number(repayAmount) });
      toast.success(res.message);
      setRepayAmount('');
      setDetail(await api.get(`/loans/${detail.loan.id}`));
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendReminders() {
    setBusy(true);
    try {
      const res = await api.post('/loans/remind', { within_days: 7 });
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!loans) return <Spinner />;

  const shown = filter === 'all' ? loans : loans.filter((l) => l.status === filter);
  const myOpenLoan = loans.some((l) => ['pending', 'approved'].includes(l.status));

  const columns = [
    { key: 'full_name', label: t('loans.borrower'), render: (l) => l.full_name },
    { key: 'amount', label: t('loans.principal'), align: 'right', money: true, render: (l) => money(l.amount) },
    { key: 'interest', label: t('loans.interest'), align: 'right', money: true, hideOnPhone: true,
      render: (l) => (l.with_interest ? money(l.interest_amount) : <span className="muted">—</span>) },
    { key: 'outstanding', label: t('loans.outstanding'), align: 'right', money: true,
      render: (l) => <span className={l.outstanding > 0 ? 'money money--neg' : 'money'}>{money(l.outstanding)}</span> },
    { key: 'due_date', label: t('loans.dueDate'), hideOnPhone: true,
      render: (l) => {
        const late = l.status === 'approved' && l.due_date && new Date(l.due_date) < new Date();
        return <span className={late ? 'loans__late' : ''}>{shortDate(l.due_date)}</span>;
      } },
    { key: 'status', label: t('common.status'),
      render: (l) => <span className={`tag tag--${STATUS_TAG[l.status]}`}>{t(`loans.${l.status === 'repaid' ? 'repaidStatus' : l.status}`)}</span> },
  ];

  return (
    <div className="loans">
      <PageHeader
        title={t('loans.title')}
        action={
          <>
            {isCommittee && (
              <button type="button" className="btn btn--ghost" onClick={sendReminders} disabled={busy}>
                {t('loans.remind')}
              </button>
            )}
            {(isCommittee || !myOpenLoan) && (
              <button type="button" className="btn" onClick={() => setApplyOpen(true)}>
                {isCommittee ? t('loans.apply') : t('loans.request')}
              </button>
            )}
          </>
        }
      />

      <div className="loans__filters" role="group" aria-label={t('common.status')}>
        {['all', 'pending', 'approved', 'repaid', 'rejected'].map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? 'loans__filter is-on' : 'loans__filter'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? t('common.all') : t(`loans.${f === 'repaid' ? 'repaidStatus' : f}`)}
          </button>
        ))}
      </div>

      <Ledger
        columns={columns}
        rows={shown}
        onRowClick={openDetail}
        empty={<EmptyState title={t('loans.empty')} />}
      />

      {/* ---- apply ---- */}
      <Modal
        open={applyOpen}
        title={isCommittee ? t('loans.apply') : t('loans.request')}
        onClose={() => setApplyOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setApplyOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="loan-form" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('loans.request')}
            </button>
          </>
        }
      >
        <form id="loan-form" onSubmit={apply} noValidate>
          {isCommittee && (
            <div className="form-row">
              <div>
                <label className="field-label" htmlFor="l-member">{t('loans.borrower')}</label>
                <select id="l-member" value={form.member_id} onChange={change('member_id')} required>
                  <option value="">—</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} — saved {money(m.total_savings)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="l-amount">{t('common.amount')}</label>
              <input id="l-amount" type="number" inputMode="decimal" min="1" step="any"
                value={form.amount} onChange={change('amount')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="l-due">{t('loans.dueDate')}</label>
              <input id="l-due" type="date" min={inputDate()} value={form.due_date} onChange={change('due_date')} />
              <span className="field-hint">Must be before the cycle ends.</span>
            </div>
          </div>

          {/* The borrower's own choice about interest. */}
          <label className="loans__interest">
            <input type="checkbox" checked={form.with_interest} onChange={change('with_interest')} />
            <span>
              <strong>{t('loans.withInterest')}</strong>
              <span className="loans__interestHelp">{t('loans.withInterestHelp')}</span>
            </span>
          </label>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="l-purpose">{t('loans.purpose')}</label>
              <textarea id="l-purpose" rows={2} value={form.purpose} onChange={change('purpose')} />
            </div>
          </div>
        </form>
      </Modal>

      {/* ---- one loan ---- */}
      <Modal
        open={!!detail}
        title={detail ? `${t('loans.statementFor')} — ${detail.loan.full_name}` : ''}
        onClose={() => setDetail(null)}
        wide
      >
        {detail && (
          <div className="loans__detail">
            <dl className="loans__rows">
              <div><dt>{t('loans.principal')}</dt><dd className="money">{money(detail.loan.amount)}</dd></div>
              <div>
                <dt>{t('loans.interest')}</dt>
                <dd className="money">
                  {detail.loan.with_interest
                    ? `${money(detail.loan.interest_amount)} (${detail.loan.interest_rate}%)`
                    : t('loans.noInterest')}
                </dd>
              </div>
              <div><dt>{t('loans.totalDue')}</dt><dd className="money">{money(detail.loan.total_due)}</dd></div>
              <div><dt>{t('loans.repaid')}</dt><dd className="money">{money(detail.loan.total_repaid)}</dd></div>
              <div className="is-strong">
                <dt>{t('loans.outstanding')}</dt>
                <dd className="money">{money(detail.loan.outstanding)}</dd>
              </div>
              <div><dt>{t('loans.dueDate')}</dt><dd>{shortDate(detail.loan.due_date)}</dd></div>
              {detail.loan.purpose && <div><dt>{t('loans.purpose')}</dt><dd>{detail.loan.purpose}</dd></div>}
              {detail.loan.decision_note && (
                <div><dt>{t('common.reason')}</dt><dd>{detail.loan.decision_note}</dd></div>
              )}
            </dl>

            {detail.loan.status === 'pending' && canDecide && (
              <div className="loans__decide">
                <label className="field-label" htmlFor="l-note">{t('loans.decisionNote')}</label>
                <textarea id="l-note" rows={2} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} />
                <div className="loans__decideBtns">
                  <button type="button" className="btn" disabled={busy} onClick={() => decide('approved')}>
                    {t('loans.approve')}
                  </button>
                  <button type="button" className="btn btn--danger" disabled={busy} onClick={() => decide('rejected')}>
                    {t('loans.reject')}
                  </button>
                </div>
              </div>
            )}

            {detail.loan.status === 'approved' && canRecordRepayment && (
              <form className="loans__repay" onSubmit={recordRepayment}>
                <label className="field-label" htmlFor="l-repay">{t('loans.recordRepayment')}</label>
                <div className="loans__repayRow">
                  <input id="l-repay" type="number" inputMode="decimal" min="1" step="any"
                    max={detail.loan.outstanding} value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)} required />
                  <button type="submit" className="btn" disabled={busy}>{t('common.save')}</button>
                </div>
              </form>
            )}

            <h3 className="loans__subhead">{t('loans.repayments')}</h3>
            {detail.repayments.length ? (
              <ul className="loans__repayList">
                {detail.repayments.map((r) => (
                  <li key={r.id}>
                    <span>{shortDate(r.date)}</span>
                    <span className="muted">
                      {r.interest_part > 0 ? `${money(r.principal_part)} + ${money(r.interest_part)} interest` : ''}
                    </span>
                    <span className="money">{money(r.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nothing repaid yet.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
