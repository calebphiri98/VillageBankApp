import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { navFor } from './navItems.js';
import './Sidebar.css';

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const { t } = useLang();
  if (!user) return null;

  const items = navFor(user.role);

  return (
    <nav className={open ? 'sidebar is-open' : 'sidebar'} aria-label={t('nav.menu')}>
      <div className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true">VB</span>
        <span className="sidebar__brandtext">{t('app.name')}</span>
      </div>

      <ul className="sidebar__list">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => (isActive ? 'sidebar__link is-on' : 'sidebar__link')}
            >
              <span className="sidebar__icon" aria-hidden="true">{item.icon}</span>
              {t(item.key)}
            </NavLink>
          </li>
        ))}
      </ul>

      <button type="button" className="sidebar__logout" onClick={() => logout()}>
        {t('nav.logout')}
      </button>
    </nav>
  );
}
