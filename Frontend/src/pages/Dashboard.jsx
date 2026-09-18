import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import Spinner from '../components/Spinner.jsx';
import MemberDashboard from './dashboards/MemberDashboard.jsx';
import TreasurerDashboard from './dashboards/TreasurerDashboard.jsx';
import SecretaryDashboard from './dashboards/SecretaryDashboard.jsx';
import AdminDashboard from './dashboards/AdminDashboard.jsx';
import CycleBar from './dashboards/CycleBar.jsx';
import './Dashboard.css';

/** Sends each role to her own board. They show genuinely different things. */
export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/dashboard')
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="notice notice--danger">
        <p>{error}</p>
        <button type="button" className="btn btn--small" onClick={() => window.location.reload()}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!data) return <Spinner />;

  const boards = {
    member: MemberDashboard,
    treasurer: TreasurerDashboard,
    secretary: SecretaryDashboard,
    admin: AdminDashboard,
  };
  const Board = boards[user.role] || MemberDashboard;

  return (
    <div className="dash">
      <header className="dash__head">
        <h1 className="dash__greeting">{t('dashboard.greeting', user.full_name.split(' ')[0])}</h1>
        <p className="dash__role">{t(`roles.${user.role}`)}</p>
      </header>

      <CycleBar cycle={data.cycle} />
      <Board data={data} />
    </div>
  );
}
