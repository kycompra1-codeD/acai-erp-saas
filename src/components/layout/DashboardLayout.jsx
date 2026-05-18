import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

export function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

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
