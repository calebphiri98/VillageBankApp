import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { money, shortDate, inputDate } from '../utils/format.js';
import './Cycles.css';

export default function Cycles() {
  const { t } = useLang();
  const toast = useToast();

  const [cycles, setCycles] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const nextYear = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  };

  const [form, setForm] = useState({
    cycle_name: `Cycle ${new Date().getFullYear()}`,
    start_date: inputDate(),
    end_date: nextYear(),
    share_value: '1000',
  });

  const load = useCallback(async () => { setCycles(await api.get('/cycles')); }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      toast.success((await api.post('/cycles', { ...form, share_value: Number(form.share_value) })).message);
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function close(id) {
    // eslint-disable-next-line no-alert
    if (!window.confirm(t('common.confirm'))) return;
    try {
      toast.success((await api.patch(`/cycles/${id}/close`)).message);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!cycles) return <Spinner />;

  return (
    <div className="cycles">
      <PageHeader
        title={t('cycles.title')}
        subtitle={t('cycles.oneYear')}
        action={<button type="button" className="btn" onClick={() => setOpen(true)}>{t('cycles.start')}</button>}
      />

      {cycles.length === 0 ? (
        <EmptyState
          title="No cycle has been started."
          body="The group saves inside a cycle. Start one before recording any money."
          action={<button type="button" className="btn" onClick={() => setOpen(true)}>{t('cycles.start')}</button>}
        />
      ) : (
        <ul className="cycles__list">
          {cycles.map((c) => (
            <li key={c.id} className={c.status === 'active' ? 'cycles__item is-active' : 'cycles__item'}>
              <div className="cycles__main">
                <h2 className="cycles__name">{c.cycle_name}</h2>
                <p className="cycles__dates">
                  {shortDate(c.start_date)} — {shortDate(c.end_date)}
                </p>
                <p className="cycles__saved">
                  {t('shareout.savedByMembers')}: <strong className="money">{money(c.total_savings)}</strong>
                </p>
              </div>
              <div className="cycles__side">
                <span className={c.status === 'active' ? 'tag tag--green' : 'tag tag--grey'}>
                  {t(`cycles.${c.status === 'active' ? 'running' : 'completed'}`)}
                </span>
                {c.status === 'active' && (
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => close(c.id)}>
                    {t('cycles.close')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        title={t('cycles.start')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="cycle-form" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form id="cycle-form" onSubmit={create} noValidate>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="c-name">{t('cycles.name')}</label>
              <input id="c-name" value={form.cycle_name} onChange={change('cycle_name')} required />
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="c-start">{t('cycles.startDate')}</label>
              <input id="c-start" type="date" value={form.start_date} onChange={change('start_date')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="c-end">{t('cycles.endDate')}</label>
              <input id="c-end" type="date" value={form.end_date} onChange={change('end_date')} required />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="c-share">{t('cycles.shareValue')}</label>
              <input id="c-share" type="number" min="1" step="any"
                value={form.share_value} onChange={change('share_value')} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
