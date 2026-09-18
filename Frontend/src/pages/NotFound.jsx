import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext.jsx';
import './NotFound.css';

export default function NotFound() {
  const { t } = useLang();
  return (
    <main className="notfound">
      <div className="notfound__panel">
        <h1 className="notfound__title">{t('errors.notFound')}</h1>
        <p className="notfound__body">The page you were looking for is not here.</p>
        <Link to="/app" className="btn">{t('nav.dashboard')}</Link>
      </div>
    </main>
  );
}
