import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

export function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, login } = useAuth();

  // Auto-login demo quando não há sessão (garante sidebar sempre visível)
  useEffect(() => {
    if (!user) {
      login('admin@acai-erp-saas.com.br', 'admin123');
    }
  }, [user, login]);

  // Fechar sidebar ao mudar de rota (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {/* Sidebar Desktop e Mobile */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        {/* Header */}
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          pathname={location.pathname}
        />

        {/* Page Content */}
        <main className="page-wrapper animate-fade">
          {children}
        </main>

        {/* Nav Mobile */}
        <BottomNav />
      </div>
    </div>
  );
}
