import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getToken, setToken, setSessionEndHandler } from '../api/client.js';
import { useLang } from './LangContext.jsx';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

// Log out after this long with no touch, tap or keypress.
const IDLE_LIMIT_MS = 10 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [idleWarning, setIdleWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const { setLang } = useLang();
  const toast = useToast();

  const warnTimer = useRef(null);
  const outTimer = useRef(null);
  const tickTimer = useRef(null);

  const clearTimers = useCallback(() => {
    [warnTimer, outTimer, tickTimer].forEach((ref) => {
      if (ref.current) { clearTimeout(ref.current); clearInterval(ref.current); ref.current = null; }
    });
  }, []);

  const logout = useCallback((message) => {
    clearTimers();
    setToken(null);
    setUser(null);
    setIdleWarning(false);
    if (message) toast.info(message);
  }, [clearTimers, toast]);

  // The API layer calls this when the server rejects an expired token.
  useEffect(() => {
    setSessionEndHandler(() => logout(null));
  }, [logout]);

  const startIdleCountdown = useCallback(() => {
    setIdleWarning(true);
    setSecondsLeft(Math.round(WARN_BEFORE_MS / 1000));

    tickTimer.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    outTimer.current = setTimeout(() => {
      logout('You were logged out because the phone was idle.');
    }, WARN_BEFORE_MS);
  }, [logout]);

  const resetIdle = useCallback(() => {
    clearTimers();
    setIdleWarning(false);
    warnTimer.current = setTimeout(startIdleCountdown, IDLE_LIMIT_MS - WARN_BEFORE_MS);
  }, [clearTimers, startIdleCountdown]);

  // Watch for activity only while somebody is logged in.
  useEffect(() => {
    if (!user) { clearTimers(); return undefined; }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'focus'];
    const onActivity = () => { if (!idleWarning) resetIdle(); };

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    resetIdle();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearTimers();
    };
    // idleWarning is deliberately watched: once the warning shows, touching
    // the screen must not silently cancel it — she has to press the button.
  }, [user, idleWarning, resetIdle, clearTimers]);

  const applyUser = useCallback((u) => {
    setUser(u);
    if (u?.language) setLang(u.language);
  }, [setLang]);

  // Restore the session on a page refresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) { setChecking(false); return; }
      try {
        const { user: me } = await api.get('/auth/me');
        if (!cancelled) applyUser(me);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [applyUser]);

  const login = useCallback(async (username, password) => {
    const data = await api.post('/auth/login', { username, password }, { auth: false });
    setToken(data.token);
    applyUser(data.user);
    return data.user;
  }, [applyUser]);

  const refresh = useCallback(async () => {
    const { user: me } = await api.get('/auth/me');
    applyUser(me);
    return me;
  }, [applyUser]);

  const value = useMemo(
    () => ({
      user, checking, login, logout, refresh, setUser,
      idleWarning, secondsLeft,
      stayLoggedIn: () => { setIdleWarning(false); resetIdle(); },
      isCommittee: !!user && ['admin', 'treasurer', 'secretary'].includes(user.role),
      isAdmin: user?.role === 'admin',
    }),
    [user, checking, login, logout, refresh, idleWarning, secondsLeft, resetIdle]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
