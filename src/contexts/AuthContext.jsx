import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, checkBackend } from '../services/api';

const AuthContext = createContext(null);

// ============================================================
// Permissões por nível (mapeamento backend → frontend)
// ============================================================
export const PERMISSIONS = {
  master: [
    'dashboard', 'pos', 'orders', 'products', 'inventory',
    'customers', 'reports', 'settings', 'kitchen',
    'employees', 'suppliers', 'finance', 'sales',
    'integrations', 'crm', 'automations', 'fiscal',
    'logistics', 'purchases', 'loyalty', 'subscription',
  ],
  admin: [
    'dashboard', 'pos', 'orders', 'products', 'inventory',
    'customers', 'reports', 'settings', 'kitchen',
    'employees', 'suppliers', 'finance', 'sales',
    'integrations', 'crm', 'automations', 'fiscal',
    'logistics', 'purchases', 'loyalty',
  ],
  gerente: [
    'dashboard', 'pos', 'orders', 'products', 'inventory',
    'customers', 'reports', 'kitchen', 'employees', 'sales',
  ],
  vendedor: ['dashboard', 'pos', 'orders', 'customers', 'sales'],
  caixa: ['dashboard', 'pos', 'orders', 'customers', 'kitchen', 'sales'],
  estoque: ['dashboard', 'inventory', 'products', 'suppliers'],
  financeiro: ['dashboard', 'finance', 'reports', 'sales'],
  operador: ['dashboard', 'pos', 'orders', 'kitchen'],
  // Modo demo (quando backend indisponível)
  admin_demo: [
    'dashboard', 'pos', 'orders', 'products', 'inventory',
    'customers', 'reports', 'settings', 'kitchen',
    'employees', 'suppliers', 'finance', 'sales',
    'integrations', 'crm', 'automations', 'fiscal',
    'logistics', 'purchases', 'loyalty', 'subscription',
  ],
};



export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [modoDemo, setModoDemo] = useState(false);

  // ── Inicialização: restaurar sessão salva ──────────────────
  useEffect(() => {
    const init = async () => {
      // Verifica health em paralelo — não bloqueia a restauração de sessão
      checkBackend().then(online => setBackendOnline(online));

      const token = localStorage.getItem('zullya_access_token');
      if (token) {
        try {
          const dados = await authApi.me();
          _setSession(dados, false);
          setBackendOnline(true);
        } catch {
          // Token inválido/expirado — sessão limpa
          localStorage.removeItem('zullya_access_token');
          localStorage.removeItem('zullya_refresh_token');
          localStorage.removeItem('zullya_auth');
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  // ── Helper: definir sessão após login/registro ─────────────
  const _setSession = (dados, isDemo = false) => {
    const userObj = {
      id: dados.usuario?.id || dados.id,
      nome: dados.usuario?.nome || dados.nome,
      name: dados.usuario?.nome || dados.nome,
      email: dados.usuario?.email || dados.email,
      nivel_permissao: dados.usuario?.nivel_permissao || dados.nivel_permissao,
      role: dados.usuario?.nivel_permissao || dados.nivel_permissao,
      avatar: dados.usuario?.avatar_url || dados.avatar_url || null,
    };
    const empresaObj = dados.empresa || {
      id: dados.tenant_id,
      nome_empresa: dados.nome_empresa,
      status: dados.tenant_status,
      trial_expira_em: dados.trial_expira_em || null,
      plano_id: dados.plano_id || null,
      plano_nome: dados.plano_nome || null,
      modulos: dados.modulos || null,
      max_usuarios: dados.max_usuarios || null,
    };

    setUser(userObj);
    setEmpresa(empresaObj);
    setModoDemo(isDemo);

    if (isDemo) {
      localStorage.setItem('zullya_auth', JSON.stringify(userObj));
    }
  };

  // ── Login Google ───────────────────────────────────────────
  const loginGoogle = async (credential) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api'}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();

      if (!data.sucesso) throw new Error(data.mensagem || 'Erro ao entrar com Google');

      if (data.precisa_completar_cadastro) {
        return { sucesso: true, precisa_completar_cadastro: true, google_dados: data.google_dados };
      }

      localStorage.setItem('zullya_access_token', data.dados.access_token);
      localStorage.setItem('zullya_refresh_token', data.dados.refresh_token);
      setBackendOnline(true);
      _setSession(data.dados, false);
      return { sucesso: true };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  };

  // ── Registro via Google (após preencher nome da empresa) ───
  const registroGoogle = async ({ google_id, email, nome, nome_empresa, avatar_url }) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api'}/auth/registro-google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_id, email, nome, nome_empresa, avatar_url }),
      });
      const data = await res.json();
      if (!data.sucesso) throw new Error(data.mensagem || 'Erro ao criar conta');
      localStorage.setItem('zullya_access_token', data.dados.access_token);
      localStorage.setItem('zullya_refresh_token', data.dados.refresh_token);
      _setSession(data.dados, false);
      return { sucesso: true };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  };

  // ── Registro com email/senha ───────────────────────────────
  const registro = async ({ nome, email, senha, nome_empresa }) => {
    try {
      const dados = await authApi.registro({ nome, email, senha, nome_empresa });
      _setSession(dados, false);
      return { sucesso: true };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  };

  // ── Login ──────────────────────────────────────────────────
  const login = async (email, password) => {
    if (!backendOnline) {
      console.warn("Tentando login mesmo com check de backend falho...");
    }

    try {
      const dados = await authApi.login(email, password);
      // Se o login funcionar, é porque o backend está online de fato
      setBackendOnline(true);
      _setSession(dados, false);
      return { sucesso: true };
    } catch (err) {
      return { sucesso: false, mensagem: err.message };
    }
  };

  // ── Logout ─────────────────────────────────────────────────
  const logout = async () => {
    if (backendOnline && !modoDemo) {
      try { await authApi.logout(); } catch { /* ignorar erro de rede */ }
    }
    setUser(null);
    setEmpresa(null);
    setModoDemo(false);
    localStorage.removeItem('zullya_auth');
    localStorage.removeItem('zullya_access_token');
    localStorage.removeItem('zullya_refresh_token');
  };

  // ── Verificar permissão ────────────────────────────────────
  const hasPermission = (section) => {
    if (!user) return false;
    const nivel = user.nivel_permissao || user.role || 'operador';
    const perms = PERMISSIONS[nivel] || [];
    return perms.includes(section);
  };

  return (
    <AuthContext.Provider value={{
      user,
      empresa,
      login,
      registro,
      loginGoogle,
      registroGoogle,
      logout,
      loading,
      isAuthenticated: !!user,
      hasPermission,
      role: user?.nivel_permissao || user?.role || null,
      modoDemo,
      backendOnline,
      name: user?.nome || user?.name,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
