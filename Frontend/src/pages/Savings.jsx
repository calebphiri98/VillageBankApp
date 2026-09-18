import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Ledger from '../components/Ledger.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { money, shortDate, inputDate } from '../utils/format.js';
import './Savings.css';

const blank = { member_id: '', amount: '', shares: '1', date: inputDate(), note: '' };

export default function Savings() {
  const { t } = useLang();
  const toast = useToast();

  const [rows, setRows] = useState(null);
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [list, sum, mem] = await Promise.all([
      api.get('/savings'),
      api.get('/savings/summary'),
      api.get('/members'),
    ]);
    setRows(list);
    setSummary(sum);
    setMembers(mem);
  }, []);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.member_id || !form.amount) return;
    setBusy(true);
    try {
      const res = await api.post('/savings', {
        member_id: Number(form.member_id),
        amount: Number(form.amount),
        shares: Number(form.shares) || 1,
        date: form.date,
        note: form.note || null,
      });
      toast.success(res.sms_sent ? `${res.message} She has been texted.` : res.message);
      setOpen(false);
      setForm(blank);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.full_name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const columns = [
    { key: 'full_name', label: t('savings.member') },
    { key: 'amount', label: t('common.amount'), align: 'right', money: true, render: (r) => money(r.amount) },
    { key: 'shares', label: t('savings.shares'), align: 'right', hideOnPhone: true },
    { key: 'date', label: t('common.date'), render: (r) => shortDate(r.date) },
    { key: 'recorded_by_name', label: t('savings.recordedBy'), hideOnPhone: true,
      render: (r) => <span className="muted">{r.recorded_by_name || '—'}</span> },
  ];

  if (!rows) return <Spinner />;

  return (
    <div className="savings">
      <PageHeader
        title={t('savings.title')}
        subtitle={t('savings.smsNote')}
        action={<button type="button" className="btn" onClick={() => setOpen(true)}>{t('savings.record')}</button>}
      />

      {summary && (
        <div className="page-grid">
          <StatCard label={t('savings.thisCycle')} value={money(summary.total_savings)} tone="gold" big />
          <StatCard label={t('common.total')} value={`${summary.entries} entries`} />
          <StatCard label={t('nav.members')} value={`${summary.savers} saving`} />
        </div>
      )}

      <div className="toolbar">
        <input
          className="toolbar__grow"
          type="search"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('common.search')}
        />
      </div>

      <Ledger
        columns={columns}
        rows={filtered}
        empty={
          <EmptyState
            title={t('savings.empty')}
            action={<button type="button" className="btn" onClick={() => setOpen(true)}>{t('savings.record')}</button>}
          />
        }
      />

      <Modal
        open={open}
        title={t('savings.record')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="saving-form" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form id="saving-form" onSubmit={submit} noValidate>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="s-member">{t('savings.member')}</label>
              <select id="s-member" value={form.member_id} onChange={change('member_id')} required>
                <option value="">—</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.membership_number})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="s-amount">{t('common.amount')}</label>
              <input id="s-amount" type="number" inputMode="decimal" min="1" step="any"
                value={form.amount} onChange={change('amount')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="s-shares">{t('savings.shares')}</label>
              <input id="s-shares" type="number" inputMode="numeric" min="1"
                value={form.shares} onChange={change('shares')} />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="s-date">{t('common.date')}</label>
              <input id="s-date" type="date" value={form.date} onChange={change('date')} />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="s-note">
                {t('savings.note')} <span className="muted">({t('common.optional')})</span>
              </label>
              <input id="s-note" value={form.note} onChange={change('note')} />
            </div>
          </div>

          <p className="savings__smsHint">{t('savings.smsNote')}</p>
        </form>
      </Modal>
    </div>
  );
}
