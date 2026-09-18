import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { api } from '../api/client.js';
import './LanguageToggle.css';

/**
 * Chichewa / English. For a logged-in member the choice is saved on her
 * account, so her text messages arrive in the same language too.
 */
export default function LanguageToggle({ compact = false }) {
  const { lang, setLang, languages } = useLang();
  const { user, setUser } = useAuth();

  const choose = async (code) => {
    if (code === lang) return;
    setLang(code);
    if (user) {
      try {
        await api.patch('/auth/language', { language: code });
        setUser({ ...user, language: code });
      } catch {
        // The screen has already switched; saving the preference can wait.
      }
    }
  };

  return (
    <div className={compact ? 'langtoggle langtoggle--compact' : 'langtoggle'} role="group" aria-label="Language">
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          className={l.code === lang ? 'langtoggle__btn is-on' : 'langtoggle__btn'}
          onClick={() => choose(l.code)}
          aria-pressed={l.code === lang}
        >
          {compact ? l.code.toUpperCase() : l.name}
        </button>
      ))}
    </div>
  );
}
