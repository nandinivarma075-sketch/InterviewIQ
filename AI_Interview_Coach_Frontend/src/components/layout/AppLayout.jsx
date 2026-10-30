import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './AppLayout.css';

export default function AppLayout({ pageTitle, pageSubtitle }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-layout ${sidebarCollapsed ? 'app-layout--collapsed' : ''}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="app-layout__body">
        <Header title={pageTitle} subtitle={pageSubtitle} />
        <main className="app-layout__main" role="main" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
