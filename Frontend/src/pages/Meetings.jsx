import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { shortDate, inputDate } from '../utils/format.js';
import './Meetings.css';

const blank = { meeting_date: inputDate(), meeting_time: '', location: '', agenda: '', notify: true };

export default function Meetings() {
  const { t } = useLang();
  const { isCommittee } = useAuth();
  const toast = useToast();

  const [meetings, setMeetings] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [marks, setMarks] = useState({});
  const [minutes, setMinutes] = useState('');

  const load = useCallback(async () => { setMeetings(await api.get('/meetings')); }, []);
  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  const change = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/meetings', form);
      toast.success(
        form.notify
          ? `${res.message} ${res.notified.sent} member(s) were texted.`
          : res.message
      );
      setOpen(false);
      setForm(blank);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id) {
    try {
      const data = await api.get(`/meetings/${id}`);
      setDetail(data);
      setMinutes(data.meeting.notes || '');
      setMarks(Object.fromEntries(data.attendance.map((a) => [a.member_id, a.status])));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function saveAttendance() {
    setBusy(true);
    try {
      const list = Object.entries(marks).map(([member_id, status]) => ({ member_id: Number(member_id), status }));
      await api.put(`/meetings/${detail.meeting.id}/attendance`, { attendance: list });
      await api.patch(`/meetings/${detail.meeting.id}`, { notes: minutes });
      toast.success('Attendance and minutes saved.');
      setDetail(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!meetings) return <Spinner />;

  return (
    <div className="meetings">
      <PageHeader
        title={t('meetings.title')}
        action={isCommittee && (
          <button type="button" className="btn" onClick={() => setOpen(true)}>{t('meetings.schedule')}</button>
        )}
      />

      {meetings.length === 0 ? (
        <EmptyState
          title={t('meetings.empty')}
          action={isCommittee && (
            <button type="button" className="btn" onClick={() => setOpen(true)}>{t('meetings.schedule')}</button>
          )}
        />
      ) : (
        <ul className="meetings__list">
          {meetings.map((m) => {
            const upcoming = new Date(m.meeting_date) >= new Date(new Date().toDateString());
            return (
              <li key={m.id} className={upcoming ? 'meetings__item is-upcoming' : 'meetings__item'}>
                <div className="meetings__date">
                  <span className="meetings__day">{new Date(m.meeting_date).getDate()}</span>
                  <span className="meetings__month">
                    {new Date(m.meeting_date).toLocaleDateString('en-GB', { month: 'short' })}
                  </span>
                </div>
                <div className="meetings__body">
                  <p className="meetings__where">
                    {m.location || 'No place written down'}
                    {m.meeting_time ? <span className="muted"> · {m.meeting_time}</span> : null}
                  </p>
                  {m.agenda && <p className="meetings__agenda">{m.agenda}</p>}
                  <p className="meetings__count">
                    {m.marked_count > 0
                      ? t('meetings.presentCount', m.present_count, m.marked_count)
                      : <span className="muted">{t('meetings.attendance')} not marked</span>}
                  </p>
                </div>
                {isCommittee && (
                  <button type="button" className="btn btn--ghost btn--small" onClick={() => openDetail(m.id)}>
                    {t('meetings.markAttendance')}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={open}
        title={t('meetings.schedule')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="meeting-form" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form id="meeting-form" onSubmit={create} noValidate>
          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="mt-date">{t('meetings.when')}</label>
              <input id="mt-date" type="date" value={form.meeting_date} onChange={change('meeting_date')} required />
            </div>
            <div>
              <label className="field-label" htmlFor="mt-time">{t('meetings.time')}</label>
              <input id="mt-time" type="time" value={form.meeting_time} onChange={change('meeting_time')} />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="mt-place">{t('meetings.place')}</label>
              <input id="mt-place" value={form.location} onChange={change('location')} />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="mt-agenda">{t('meetings.agenda')}</label>
              <textarea id="mt-agenda" rows={3} value={form.agenda} onChange={change('agenda')} />
            </div>
          </div>

          <label className="meetings__notify">
            <input type="checkbox" checked={form.notify} onChange={change('notify')} />
            <span>{t('meetings.notify')}</span>
          </label>
        </form>
      </Modal>

      <Modal
        open={!!detail}
        title={detail ? `${t('meetings.attendance')} — ${shortDate(detail.meeting.meeting_date)}` : ''}
        onClose={() => setDetail(null)}
        wide
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setDetail(null)}>{t('common.cancel')}</button>
            <button type="button" className="btn" onClick={saveAttendance} disabled={busy}>
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        {detail && (
          <>
            <ul className="meetings__marks">
              {detail.attendance.map((a) => (
                <li key={a.member_id}>
                  <span className="meetings__markName">{a.full_name}</span>
                  <div className="meetings__markBtns" role="group" aria-label={a.full_name}>
                    {['present', 'absent', 'excused'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={marks[a.member_id] === s ? `meetings__mark is-${s}` : 'meetings__mark'}
                        onClick={() => setMarks((m) => ({ ...m, [a.member_id]: s }))}
                        aria-pressed={marks[a.member_id] === s}
                      >
                        {t(`meetings.${s}`)}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>

            <div className="meetings__minutes">
              <label className="field-label" htmlFor="mt-minutes">{t('meetings.minutes')}</label>
              <textarea id="mt-minutes" rows={4} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
