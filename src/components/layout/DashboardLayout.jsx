import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';
import TrialBanner from './TrialBanner';

export function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, empresa, loading } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Aguarda verificação de sessão para não piscar conteúdo
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // Não autenticado → login
  if (!user) return <Navigate to="/login" replace />;

  // Tenant expirado → forçar assinatura (exceto se já está na página de assinatura)
  const isExpired = empresa?.status === 'expirado';
  if (isExpired && location.pathname !== '/assinatura') {
    return <Navigate to="/assinatura" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          pathname={location.pathname}
        />

        {/* Banner de trial (dias restantes) */}
        <TrialBanner />

        <main className="page-wrapper animate-fade">
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
