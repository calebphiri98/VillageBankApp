import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import LanguageToggle from './LanguageToggle.jsx';
import { initials } from '../utils/format.js';
import './Topbar.css';

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const { t } = useLang();
  if (!user) return null;

  return (
    <header className="topbar">
      <button type="button" className="topbar__menu" onClick={onMenu} aria-label={t('nav.menu')}>
        <span aria-hidden="true">&#9776;</span>
      </button>

      <div className="topbar__who">
        <span className="topbar__avatar" aria-hidden="true">{initials(user.full_name)}</span>
        <span className="topbar__names">
          <span className="topbar__name">{user.full_name}</span>
          <span className="topbar__role">{t(`roles.${user.role}`)}</span>
        </span>
      </div>

      <LanguageToggle compact />
    </header>
  );
}
