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
import './Fines.css';

const blank = { member_id: '', amount: '', reason: '', date: inputDate(), paid: false };

export default function Fines() {
  const { t } = useLang();
  const { isCommittee } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState(null);
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(await api.get('/fines'));
    if (isCommittee) { try { setMembers(await api.get('/members')); } catch { /* ignore */ } }
  }, [isCommittee]);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/fines', {
        ...form, member_id: Number(form.member_id), amount: Number(form.amount),
      });
      toast.success(res.message);
      setOpen(false);
      setForm(blank);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(id) {
    try {
      toast.success((await api.patch(`/fines/${id}/pay`)).message);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!rows) return <Spinner />;

  const columns = [
    { key: 'full_name', label: t('common.name') },
    { key: 'reason', label: t('common.reason'), hideOnPhone: true,
      render: (r) => r.reason || <span className="muted">—</span> },
    { key: 'amount', label: t('common.amount'), align: 'right', money: true, render: (r) => money(r.amount) },
    { key: 'date', label: t('common.date'), render: (r) => shortDate(r.date) },
    { key: 'paid', label: t('common.status'),
      render: (r) => (
        r.paid
          ? <span className="tag tag--green">{t('fines.paid')}</span>
          : isCommittee
            ? <button type="button" className="btn btn--small btn--ghost" onClick={(e) => { e.stopPropagation(); markPaid(r.id); }}>
                {t('fines.markPaid')}
              </button>
            : <span className="tag tag--red">{t('fines.unpaid')}</span>
      ) },
  ];

  return (
    <div className="fines">
      <PageHeader
        title={t('fines.title')}
        action={isCommittee && (
          <button type="button" className="btn" onClick={() => setOpen(true)}>{t('fines.record')}</button>
        )}
      />

      <Ledger columns={columns} rows={rows} empty={<EmptyState title={t('fines.empty')} />} />

      <Modal
        open={open}
        title={t('fines.record')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="fine-form" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form id="fine-form" onSubmit={submit} noValidate>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="f-member">{t('savings.member')}</label>
              <select id="f-member" value={form.member_id}
                onChange={(e) => setForm((f) => ({ ...f, member_id: e.target.value }))} required>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="f-amount">{t('common.amount')}</label>
              <input id="f-amount" type="number" inputMode="decimal" min="1" step="any"
                value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <label className="field-label" htmlFor="f-date">{t('common.date')}</label>
              <input id="f-date" type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="f-reason">{t('common.reason')}</label>
              <input id="f-reason" value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Late to the meeting" />
              <span className="field-hint">She is texted the reason, so write it plainly.</span>
            </div>
          </div>

          <label className="fines__paid">
            <input type="checkbox" checked={form.paid}
              onChange={(e) => setForm((f) => ({ ...f, paid: e.target.checked }))} />
            <span>She has already paid it</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
