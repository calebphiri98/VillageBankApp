import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext.jsx';
import StatCard from '../../components/StatCard.jsx';
import { money, plainNumber, shortDate } from '../../utils/format.js';
import './AdminDashboard.css';

/**
 * The chairlady sees the whole group: the money, the people and the
 * system itself (locked accounts, texts going out).
 */
export default function AdminDashboard({ data }) {
  const { t } = useLang();
  const m = data.money || {};
  const sys = data.system || {};

  return (
    <>
      <div className="page-grid">
        <StatCard label={t('dashboard.cashInBox')}      value={money(m.cash_in_box)}     tone="gold" big />
        <StatCard label={t('dashboard.totalSavings')}   value={money(m.total_savings)}   tone="green" />
        <StatCard label={t('dashboard.loansOut')}       value={money(m.outstanding)}     tone="blue" />
        <StatCard label={t('dashboard.welfareBalance')} value={money(m.welfare_balance)} />
      </div>

      <section className="adash__group">
        <h2 className="dash__sectionTitle">{t('nav.people')}</h2>
        <div className="page-grid">
          <StatCard label={t('dashboard.activeMembers')} value={plainNumber(data.members?.active)} />
          <StatCard label={t('dashboard.pendingRequests')} value={plainNumber(data.pending_join_requests)}
            tone={data.pending_join_requests > 0 ? 'gold' : 'plain'} />
          <StatCard label={t('dashboard.pendingLoans')} value={plainNumber(data.loans?.pending)} />
          <StatCard label={t('dashboard.overdueLoans')} value={plainNumber(data.loans?.overdue)}
            tone={data.loans?.overdue > 0 ? 'red' : 'plain'} />
        </div>
      </section>

      <section className="adash__system">
        <h2 className="dash__sectionTitle">System</h2>
        <div className="adash__sysGrid">
          <div className="adash__sysItem">
            <span className="adash__sysNum">{plainNumber(sys.active_users)}</span>
            <span className="adash__sysLabel">accounts in use</span>
          </div>
          <div className={sys.locked_users > 0 ? 'adash__sysItem is-alert' : 'adash__sysItem'}>
            <span className="adash__sysNum">{plainNumber(sys.locked_users)}</span>
            <span className="adash__sysLabel">{t('dashboard.lockedAccounts').toLowerCase()}</span>
          </div>
          <div className="adash__sysItem">
            <span className="adash__sysNum">{plainNumber(sys.sms_today)}</span>
            <span className="adash__sysLabel">{t('dashboard.smsToday').toLowerCase()}</span>
          </div>
          <div className={sys.sms_failed > 0 ? 'adash__sysItem is-alert' : 'adash__sysItem'}>
            <span className="adash__sysNum">{plainNumber(sys.sms_failed)}</span>
            <span className="adash__sysLabel">texts that failed</span>
          </div>
        </div>

        {sys.locked_users > 0 && (
          <p className="notice notice--warn">
            {sys.locked_users} account(s) are locked after wrong passwords. You can unlock them.{' '}
            <Link to="/app/members">{t('nav.members')}</Link>
          </p>
        )}
      </section>

      <section className="adash__quick">
        <h2 className="dash__sectionTitle">Common jobs</h2>
        <div className="adash__links">
          <Link to="/app/members" className="btn btn--ghost">{t('members.addPerson')}</Link>
          <Link to="/app/savings" className="btn btn--ghost">{t('savings.record')}</Link>
          <Link to="/app/messages" className="btn btn--ghost">{t('messages.send')}</Link>
          <Link to="/app/shareout" className="btn btn--ghost">{t('shareout.title')}</Link>
        </div>
      </section>

      {data.next_meeting && (
        <p className="adash__meeting">
          {t('dashboard.nextMeeting')}: <strong>{shortDate(data.next_meeting.meeting_date)}</strong>
          {data.next_meeting.location ? ` · ${data.next_meeting.location}` : ''}
        </p>
      )}
    </>
  );
}
