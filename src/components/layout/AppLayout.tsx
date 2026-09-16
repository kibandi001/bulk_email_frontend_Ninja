import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AppLayout.css';

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nca_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nca_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleSidebarToggle = () => {
    if (window.matchMedia('(max-width: 860px)').matches) {
      setMobileOpen((prev) => !prev);
      return;
    }
    toggleSidebar();
  };

  return (
    <div className={`app-layout ${collapsed ? 'app-layout--collapsed' : ''} ${mobileOpen ? 'app-layout--mobile-open' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={handleSidebarToggle}
        onCloseMobile={() => setMobileOpen(false)}
      />
      {mobileOpen && (
        <button
          type="button"
          className="app-layout__backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="app-layout__main">
        <Topbar title={title} collapsed={collapsed} onToggleSidebar={handleSidebarToggle} />
        <main className="app-layout__content">{children}</main>
      </div>
    </div>
  );
}
