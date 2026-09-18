import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import './IdleDialog.css';

/** Shown a minute before the automatic log-out. */
export default function IdleDialog() {
  const { idleWarning, secondsLeft, stayLoggedIn, logout } = useAuth();
  const { t } = useLang();

  if (!idleWarning) return null;

  return (
    <div className="idle" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="idle__panel">
        <p className="idle__count" aria-hidden="true">{secondsLeft}</p>
        <h2 className="idle__title" id="idle-title">{t('idle.title')}</h2>
        <p className="idle__body">{t('idle.body', secondsLeft)}</p>
        <div className="idle__actions">
          <button type="button" className="btn btn--full" onClick={stayLoggedIn}>
            {t('idle.stay')}
          </button>
          <button type="button" className="btn btn--ghost btn--full" onClick={() => logout()}>
            {t('idle.out')}
          </button>
        </div>
      </div>
    </div>
  );
}
