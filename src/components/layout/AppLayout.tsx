import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import './AppLayout.css';

export function AppLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <Topbar title={title} />
        <main className="app-layout__content">{children}</main>
      </div>
    </div>
  );
}
