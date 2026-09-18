import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useLang } from '../context/LangContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { dateTime, humanAction } from '../utils/format.js';
import './Activity.css';

/** Every money action leaves a trace here. Both writers are named. */
export default function Activity() {
  const { t } = useLang();
  const toast = useToast();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    api.get('/audit?limit=150').then(setRows).catch((e) => toast.error(e.message));
  }, [toast]);

  if (!rows) return <Spinner />;

  return (
    <div className="activity">
      <PageHeader title={t('nav.activity')} subtitle="Who did what, and when." />

      {rows.length === 0 ? (
        <EmptyState title={t('common.none')} />
      ) : (
        <ol className="activity__list">
          {rows.map((a) => (
            <li key={a.id} className="activity__item">
              <div className="activity__marker" aria-hidden="true" />
              <div className="activity__body">
                <p className="activity__action">{humanAction(a.action)}</p>
                {a.details && <p className="activity__details">{a.details}</p>}
                <p className="activity__meta">
                  {a.full_name || 'System'}
                  {a.role ? ` · ${t(`roles.${a.role}`)}` : ''} · {dateTime(a.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
