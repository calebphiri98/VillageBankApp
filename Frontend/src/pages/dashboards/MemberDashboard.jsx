import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext.jsx';
import StatCard from '../../components/StatCard.jsx';
import { money, shortDate } from '../../utils/format.js';
import './MemberDashboard.css';

/** What one woman needs to know: what she saved, what she owes, what is coming. */
export default function MemberDashboard({ data }) {
  const { t } = useLang();
  const { savings, active_loan: loan, unpaid_fines: fines, my_share: share, next_meeting: meeting } = data;

  return (
    <>
      {share && share.status === 'distributed' && (
        <section className="mdash__share">
          <p className="mdash__shareLabel">{t('dashboard.shareReady')}</p>
          <p className="mdash__shareAmount money">{money(share.share_amount)}</p>
          <Link to="/app/shareout" className="btn btn--gold btn--small">{t('common.view')}</Link>
        </section>
      )}

      <div className="page-grid">
        <StatCard
          label={t('dashboard.mySavings')}
          value={money(savings?.total)}
          hint={`${savings?.shares || 0} ${t('savings.shares').toLowerCase()}`}
          tone="gold"
          big
        />
        <StatCard
          label={t('dashboard.unpaidFines')}
          value={money(fines)}
          tone={fines > 0 ? 'red' : 'plain'}
        />
      </div>

      <section className="mdash__loan">
        <h2 className="dash__sectionTitle">{t('dashboard.myLoan')}</h2>
        {loan ? (
          <div className="mdash__loanCard">
            <div className="mdash__loanTop">
              <span className={`tag tag--${loan.status === 'pending' ? 'gold' : 'green'}`}>
                {t(`loans.${loan.status === 'pending' ? 'pending' : 'approved'}`)}
              </span>
              {!loan.with_interest && <span className="tag tag--blue">{t('loans.noInterest')}</span>}
            </div>

            <dl className="mdash__loanRows">
              <div><dt>{t('loans.principal')}</dt><dd className="money">{money(loan.amount)}</dd></div>
              <div><dt>{t('loans.interest')}</dt><dd className="money">{money(loan.interest_amount)}</dd></div>
              <div><dt>{t('loans.totalDue')}</dt><dd className="money">{money(loan.total_due)}</dd></div>
              <div className="is-strong">
                <dt>{t('dashboard.outstanding')}</dt>
                <dd className="money">{money(loan.outstanding)}</dd>
              </div>
              <div><dt>{t('dashboard.dueBy')}</dt><dd>{shortDate(loan.due_date)}</dd></div>
            </dl>

            <Link to="/app/loans" className="btn btn--ghost btn--small btn--full">{t('common.view')}</Link>
          </div>
        ) : (
          <div className="mdash__noLoan">
            <p>{t('dashboard.noLoan')}</p>
            <Link to="/app/loans" className="btn btn--small">{t('loans.request')}</Link>
          </div>
        )}
      </section>

      <section className="mdash__meeting">
        <h2 className="dash__sectionTitle">{t('dashboard.nextMeeting')}</h2>
        {meeting ? (
          <p className="mdash__meetingLine">
            <strong>{shortDate(meeting.meeting_date)}</strong>
            {meeting.meeting_time ? ` — ${meeting.meeting_time}` : ''}
            {meeting.location ? <span className="muted"> · {meeting.location}</span> : null}
          </p>
        ) : (
          <p className="muted">{t('dashboard.noMeeting')}</p>
        )}
      </section>
    </>
  );
}
