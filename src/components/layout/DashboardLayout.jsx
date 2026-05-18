import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';
import TrialBanner from './TrialBanner';

export function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, empresa, loading } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Redirecionar via useEffect para dar tempo ao React processar o state de auth
  // (evita race condition após login/registro onde user ainda é null no primeiro render)
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (empresa?.status === 'expirado' && location.pathname !== '/assinatura') {
      navigate('/assinatura', { replace: true });
    }
  }, [user, empresa, loading, location.pathname, navigate]);

  // Spinner durante verificação de sessão
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Aguarda redirect do useEffect (evita flash de conteúdo protegido)
  if (!user) return null;

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
