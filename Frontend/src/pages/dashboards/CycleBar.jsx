import { useLang } from '../../context/LangContext.jsx';
import { shortDate } from '../../utils/format.js';
import './CycleBar.css';

/** How far through the year the group is, and when the box gets opened. */
export default function CycleBar({ cycle }) {
  const { t } = useLang();
  if (!cycle) {
    return <p className="notice notice--warn">No saving cycle is running. The chairlady needs to start one.</p>;
  }

  return (
    <section className="cyclebar">
      <div className="cyclebar__top">
        <div>
          <p className="cyclebar__label">{t('dashboard.cycleProgress')}</p>
          <p className="cyclebar__name">{cycle.cycle_name}</p>
        </div>
        <p className="cyclebar__remaining">{t('dashboard.weeksLeft', cycle.days_remaining)}</p>
      </div>

      <div
        className="cyclebar__track"
        role="progressbar"
        aria-valuenow={cycle.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('dashboard.cycleProgress')}
      >
        <div className="cyclebar__fill" style={{ width: `${cycle.progress}%` }} />
      </div>

      <div className="cyclebar__dates">
        <span>{shortDate(cycle.start_date)}</span>
        <span>{shortDate(cycle.end_date)}</span>
      </div>
    </section>
  );
}
