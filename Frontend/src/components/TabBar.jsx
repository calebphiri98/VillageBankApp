import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { navFor } from './navItems.js';
import './TabBar.css';

/** The bottom bar on a phone: the handful of things used at every meeting. */
export default function TabBar({ onMore }) {
  const { user } = useAuth();
  const { t } = useLang();
  if (!user) return null;

  const items = navFor(user.role).filter((i) => i.phone).slice(0, 4);

  return (
    <nav className="tabbar" aria-label={t('nav.menu')}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'tabbar__item is-on' : 'tabbar__item')}
        >
          <span className="tabbar__icon" aria-hidden="true">{item.icon}</span>
          <span className="tabbar__label">{t(item.key)}</span>
        </NavLink>
      ))}
      <button type="button" className="tabbar__item" onClick={onMore}>
        <span className="tabbar__icon" aria-hidden="true">&#9776;</span>
        <span className="tabbar__label">{t('nav.more')}</span>
      </button>
    </nav>
  );
}
