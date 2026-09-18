import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext.jsx';
import StatCard from '../../components/StatCard.jsx';
import { plainNumber, shortDate, dateTime, humanAction } from '../../utils/format.js';
import './SecretaryDashboard.css';

/**
 * The secretary keeps the record of people: who came, who wants to join,
 * and what the group did. She writes alongside the treasurer.
 */
export default function SecretaryDashboard({ data }) {
  const { t } = useLang();

  return (
    <>
      <div className="page-grid">
        <StatCard label={t('dashboard.activeMembers')} value={plainNumber(data.members?.active)} tone="green" big />
        <StatCard label={t('dashboard.attendanceRate')} value={`${data.attendance_rate ?? 0}%`} tone="blue" />
        <StatCard
          label={t('dashboard.pendingRequests')}
          value={plainNumber(data.pending_join_requests)}
          tone={data.pending_join_requests > 0 ? 'gold' : 'plain'}
        />
        <StatCard label={t('dashboard.pendingLoans')} value={plainNumber(data.loans?.pending)} />
      </div>

      {data.pending_join_requests > 0 && (
        <p className="notice notice--warn">
          {data.pending_join_requests} woman/women are waiting for the group to decide.{' '}
          <Link to="/app/requests">{t('common.view')}</Link>
        </p>
      )}

      <section className="sdash__next">
        <h2 className="dash__sectionTitle">{t('dashboard.nextMeeting')}</h2>
        {data.next_meeting ? (
          <p className="sdash__nextLine">
            <strong>{shortDate(data.next_meeting.meeting_date)}</strong>
            {data.next_meeting.meeting_time ? ` — ${data.next_meeting.meeting_time}` : ''}
            {data.next_meeting.location ? <span className="muted"> · {data.next_meeting.location}</span> : null}
          </p>
        ) : (
          <div className="sdash__noMeeting">
            <p className="muted">{t('dashboard.noMeeting')}</p>
            <Link to="/app/meetings" className="btn btn--small">{t('meetings.schedule')}</Link>
          </div>
        )}
      </section>

      <section className="sdash__cols">
        <div className="sdash__col">
          <h2 className="dash__sectionTitle">{t('dashboard.recentMeetings')}</h2>
          {data.recent_meetings?.length ? (
            <ul className="sdash__meetings">
              {data.recent_meetings.map((mt) => (
                <li key={mt.id}>
                  <span>{shortDate(mt.meeting_date)}</span>
                  <span className="sdash__present">{mt.present_count} present</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('meetings.empty')}</p>
          )}
          <Link to="/app/meetings" className="btn btn--ghost btn--small">{t('meetings.title')}</Link>
        </div>

        <div className="sdash__col">
          <h2 className="dash__sectionTitle">{t('dashboard.recentActivity')}</h2>
          {data.recent_activity?.length ? (
            <ul className="sdash__activity">
              {data.recent_activity.map((a, i) => (
                <li key={i}>
                  <span className="sdash__action">{humanAction(a.action)}</span>
                  {a.details && <span className="sdash__details">{a.details}</span>}
                  <span className="sdash__when">{a.full_name || '—'} · {dateTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t('common.none')}</p>
          )}
          <Link to="/app/activity" className="btn btn--ghost btn--small">{t('nav.activity')}</Link>
        </div>
      </section>
    </>
  );
}
