import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import TabBar from './TabBar.jsx';
import IdleDialog from './IdleDialog.jsx';
import './Layout.css';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever she lands on a new page.
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <div className="shell">
      <Sidebar open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />

      {drawerOpen && (
        <button
          type="button"
          className="shell__scrim"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="shell__main">
        <Topbar onMenu={() => setDrawerOpen((v) => !v)} />
        <main className="shell__content">
          <div className="shell__inner">
            <Outlet />
          </div>
        </main>
      </div>

      <TabBar onMore={() => setDrawerOpen(true)} />
      <IdleDialog />
    </div>
  );
}
