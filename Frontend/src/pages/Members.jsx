import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Ledger from '../components/Ledger.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { money, shortDate } from '../utils/format.js';
import './Members.css';

const blank = {
  full_name: '', phone: '', role: 'member', language: 'ny',
  village: '', next_of_kin: '', next_of_kin_phone: '', username: '',
};

export default function Members() {
  const { t } = useLang();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [people, setPeople] = useState(null);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setPeople(await api.get('/users'));
  }, []);

  useEffect(() => { load().catch((e) => toast.error(e.message)); }, [load, toast]);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function addPerson(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post('/users', form);
      setCredentials({
        name: form.full_name,
        username: res.user.username,
        password: res.temporary_password,
        smsSent: res.sms_sent,
      });
      setAddOpen(false);
      setForm(blank);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function act(id, what) {
    setBusy(true);
    try {
      if (what === 'unlock') {
        toast.success((await api.post(`/users/${id}/unlock`)).message);
      } else if (what === 'reset') {
        const res = await api.post(`/users/${id}/reset-password`);
        const person = people.find((p) => p.id === id);
        setCredentials({
          name: person?.full_name, username: person?.username,
          password: res.temporary_password, smsSent: res.sms_sent,
        });
      } else if (what === 'suspend') {
        // eslint-disable-next-line no-alert
        if (!window.confirm(t('common.confirm'))) return;
        toast.success((await api.del(`/users/${id}`)).message);
      }
      setDetail(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    if (!people) return [];
    const q = search.trim().toLowerCase();
    return q
      ? people.filter((p) => p.full_name.toLowerCase().includes(q) || p.username.includes(q))
      : people;
  }, [people, search]);

  if (!people) return <Spinner />;

  const isLocked = (p) => p.locked_until && new Date(p.locked_until) > new Date();

  const columns = [
    { key: 'full_name', label: t('common.name') },
    { key: 'username', label: t('login.username'), hideOnPhone: true,
      render: (p) => <code className="members__user">{p.username}</code> },
    { key: 'role', label: t('common.role'),
      render: (p) => <span className="tag tag--grey">{t(`roles.${p.role}`)}</span> },
    { key: 'phone', label: t('common.phone'), hideOnPhone: true, render: (p) => p.phone || '—' },
    { key: 'state', label: t('common.status'),
      render: (p) => {
        if (!p.is_active) return <span className="tag tag--red">{t('members.inactive')}</span>;
        if (isLocked(p)) return <span className="tag tag--gold">{t('members.locked')}</span>;
        return <span className="tag tag--green">{t('members.active')}</span>;
      } },
  ];

  return (
    <div className="members">
      <PageHeader
        title={t('members.title')}
        subtitle={`${people.filter((p) => p.is_active).length} ${t('members.active').toLowerCase()}`}
        action={isAdmin && (
          <button type="button" className="btn" onClick={() => setAddOpen(true)}>{t('members.addPerson')}</button>
        )}
      />

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
        onRowClick={setDetail}
        empty={<EmptyState title={t('members.empty')} />}
      />

      {/* ---- add ---- */}
      <Modal
        open={addOpen}
        title={t('members.addPerson')}
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setAddOpen(false)}>{t('common.cancel')}</button>
            <button type="submit" form="member-form" className="btn" disabled={busy}>
              {busy ? t('common.saving') : t('common.add')}
            </button>
          </>
        }
      >
        <form id="member-form" onSubmit={addPerson} noValidate>
          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="m-name">{t('common.name')}</label>
              <input id="m-name" value={form.full_name} onChange={change('full_name')} required />
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="m-phone">{t('common.phone')}</label>
              <input id="m-phone" type="tel" inputMode="tel" placeholder="0995727978"
                value={form.phone} onChange={change('phone')} />
              <span className="field-hint">Her username and password are texted here.</span>
            </div>
            <div>
              <label className="field-label" htmlFor="m-village">{t('common.village')}</label>
              <input id="m-village" value={form.village} onChange={change('village')} />
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="m-role">{t('common.role')}</label>
              <select id="m-role" value={form.role} onChange={change('role')}>
                <option value="member">{t('roles.member')}</option>
                <option value="secretary">{t('roles.secretary')}</option>
                <option value="treasurer">{t('roles.treasurer')}</option>
                <option value="admin">{t('roles.admin')}</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="m-lang">{t('common.language')}</label>
              <select id="m-lang" value={form.language} onChange={change('language')}>
                <option value="ny">Chichewa</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="field-label" htmlFor="m-username">
                {t('login.username')} <span className="muted">({t('common.optional')})</span>
              </label>
              <input id="m-username" autoCapitalize="none" value={form.username} onChange={change('username')} />
              <span className="field-hint">Leave this empty and one is made from her name.</span>
            </div>
          </div>

          <div className="form-row form-row--2">
            <div>
              <label className="field-label" htmlFor="m-kin">{t('members.nextOfKin')}</label>
              <input id="m-kin" value={form.next_of_kin} onChange={change('next_of_kin')} />
            </div>
            <div>
              <label className="field-label" htmlFor="m-kinphone">{t('common.phone')}</label>
              <input id="m-kinphone" type="tel" value={form.next_of_kin_phone} onChange={change('next_of_kin_phone')} />
            </div>
          </div>
        </form>
      </Modal>

      {/* ---- credentials, shown once ---- */}
      <Modal
        open={!!credentials}
        title={t('members.tempPassword')}
        onClose={() => setCredentials(null)}
        footer={<button type="button" className="btn" onClick={() => setCredentials(null)}>{t('common.close')}</button>}
      >
        {credentials && (
          <div className="members__creds">
            <p className="notice notice--warn">{t('members.writeItDown')}</p>
            <dl className="members__credRows">
              <div><dt>{t('common.name')}</dt><dd>{credentials.name}</dd></div>
              <div><dt>{t('login.username')}</dt><dd><code>{credentials.username}</code></dd></div>
              <div><dt>{t('login.password')}</dt><dd><code className="members__pass">{credentials.password}</code></dd></div>
            </dl>
            <p className={credentials.smsSent ? 'notice notice--good' : 'notice notice--danger'}>
              {credentials.smsSent
                ? 'These have also been texted to her phone.'
                : 'The text message did not go out. Give her these details yourself.'}
            </p>
          </div>
        )}
      </Modal>

      {/* ---- one person ---- */}
      <Modal
        open={!!detail}
        title={detail?.full_name || ''}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="members__detail">
            <dl className="members__credRows">
              <div><dt>{t('login.username')}</dt><dd><code>{detail.username}</code></dd></div>
              <div><dt>{t('common.role')}</dt><dd>{t(`roles.${detail.role}`)}</dd></div>
              <div><dt>{t('common.phone')}</dt><dd>{detail.phone || '—'}</dd></div>
              <div><dt>{t('members.number')}</dt><dd>{detail.membership_number || '—'}</dd></div>
              <div><dt>{t('common.village')}</dt><dd>{detail.village || '—'}</dd></div>
              <div><dt>{t('common.language')}</dt><dd>{detail.language === 'en' ? 'English' : 'Chichewa'}</dd></div>
              <div><dt>Last logged in</dt><dd>{detail.last_login ? shortDate(detail.last_login) : 'Never'}</dd></div>
            </dl>

            {isAdmin && (
              <div className="members__actions">
                {isLocked(detail) && (
                  <button type="button" className="btn btn--gold" disabled={busy}
                    onClick={() => act(detail.id, 'unlock')}>{t('members.unlock')}</button>
                )}
                <button type="button" className="btn btn--ghost" disabled={busy}
                  onClick={() => act(detail.id, 'reset')}>{t('members.newPassword')}</button>
                {detail.is_active && (
                  <button type="button" className="btn btn--danger" disabled={busy}
                    onClick={() => act(detail.id, 'suspend')}>{t('members.suspend')}</button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
