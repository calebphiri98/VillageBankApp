import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { dateTime } from '../utils/format.js';
import './Messages.css';

const MAX_LEN = 320;

/**
 * Send to the whole group, to one role, to a few chosen people, or to a
 * single number. Whether it is a broadcast is shown before she presses send.
 */
export default function Messages() {
  const { t } = useLang();
  const toast = useToast();

  const [target, setTarget] = useState('everyone');
  const [role, setRole] = useState('member');
  const [picked, setPicked] = useState([]);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState(null);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [mem, log, st] = await Promise.all([
      api.get('/members'), api.get('/sms?limit=60'), api.get('/sms/stats'),
    ]);
    setMembers(mem);
    setHistory(log);
    setStats(st);
  }, []);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  const isBroadcast = target === 'everyone' || target === 'role' || (target === 'selected' && picked.length > 1);
  const remaining = MAX_LEN - message.length;

  const shownMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? members.filter((m) => m.full_name.toLowerCase().includes(q)) : members;
  }, [members, search]);

  const recipientCount = useMemo(() => {
    if (target === 'everyone') return members.length;
    if (target === 'role') return members.filter((m) => m.role === role).length;
    if (target === 'selected') return picked.length;
    return phone ? 1 : 0;
  }, [target, members, role, picked, phone]);

  function togglePick(id) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function send(e) {
    e.preventDefault();
    if (!message.trim()) return;
    if (isBroadcast) {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Send this to ${recipientCount} people?`)) return;
    }

    setBusy(true);
    try {
      const body = { target, message: message.trim() };
      if (target === 'role') body.role = role;
      if (target === 'selected') body.member_ids = picked;
      if (target === 'number') body.phone = phone;

      const res = await api.post('/sms/send', body);
      toast.success(res.message);
      setMessage('');
      setPicked([]);
      setPhone('');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!history) return <Spinner />;

  return (
    <div className="msgs">
      <PageHeader
        title={t('messages.title')}
        subtitle={stats ? `${stats.today} sent today` : undefined}
      />

      {stats?.dry_run && <p className="notice notice--warn">{t('messages.dryRun')}</p>}

      <form className="msgs__composer" onSubmit={send} noValidate>
        <fieldset className="msgs__targets">
          <legend className="field-label">{t('messages.to')}</legend>
          <div className="msgs__targetBtns">
            {[
              ['everyone', t('messages.everyone')],
              ['role', t('messages.byRole')],
              ['selected', t('messages.selected')],
              ['number', t('messages.oneNumber')],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={target === value ? 'msgs__target is-on' : 'msgs__target'}
                onClick={() => setTarget(value)}
                aria-pressed={target === value}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {target === 'role' && (
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="msg-role">{t('common.role')}</label>
              <select id="msg-role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="member">{t('roles.member')}</option>
                <option value="secretary">{t('roles.secretary')}</option>
                <option value="treasurer">{t('roles.treasurer')}</option>
                <option value="admin">{t('roles.admin')}</option>
              </select>
            </div>
          </div>
        )}

        {target === 'number' && (
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="msg-phone">{t('common.phone')}</label>
              <input id="msg-phone" type="tel" inputMode="tel" placeholder="0995727978"
                value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
          </div>
        )}

        {target === 'selected' && (
          <div className="msgs__picker">
            <label className="field-label" htmlFor="msg-search">{t('messages.pickPeople')}</label>
            <input id="msg-search" type="search" placeholder={t('common.search')}
              value={search} onChange={(e) => setSearch(e.target.value)} />
            <ul className="msgs__people">
              {shownMembers.map((m) => (
                <li key={m.id}>
                  <label className={picked.includes(m.id) ? 'msgs__person is-on' : 'msgs__person'}>
                    <input type="checkbox" checked={picked.includes(m.id)} onChange={() => togglePick(m.id)} />
                    <span className="msgs__personName">{m.full_name}</span>
                    <span className="msgs__personPhone">{m.phone || 'no phone'}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="form-row">
          <div>
            <label className="field-label" htmlFor="msg-text">{t('messages.message')}</label>
            <textarea
              id="msg-text"
              rows={4}
              maxLength={MAX_LEN}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <span className="field-hint">{t('messages.charsLeft', remaining)}</span>
          </div>
        </div>

        <div className="msgs__send">
          <p className={isBroadcast ? 'msgs__kind is-broadcast' : 'msgs__kind'}>
            {isBroadcast ? t('messages.broadcast') : t('messages.private')}
            <span className="msgs__count">{recipientCount} {recipientCount === 1 ? 'person' : 'people'}</span>
          </p>
          <button type="submit" className="btn" disabled={busy || !message.trim() || recipientCount === 0}>
            {busy ? t('common.sending') : t('messages.send')}
          </button>
        </div>
      </form>

      <h2 className="msgs__h2">{t('messages.history')}</h2>
      {history.length === 0 ? (
        <EmptyState title={t('messages.empty')} />
      ) : (
        <ul className="msgs__log">
          {history.map((m) => (
            <li key={m.id} className="msgs__logItem">
              <div className="msgs__logTop">
                <span className="msgs__logWho">{m.recipient_name || m.recipient_phone}</span>
                <span className={`tag tag--${m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : 'grey'}`}>
                  {t(`messages.${m.status}`)}
                </span>
              </div>
              <p className="msgs__logText">{m.message}</p>
              <p className="msgs__logMeta">
                {dateTime(m.sent_at)}
                {m.is_broadcast ? ` · ${t('messages.broadcast')}` : ''}
                {m.sent_by_name ? ` · ${m.sent_by_name}` : ''}
                {m.error ? ` · ${m.error}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
