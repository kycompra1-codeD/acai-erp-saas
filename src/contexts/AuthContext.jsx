import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Usuários demo com papéis diferentes
export const DEMO_USERS = [
  {
    id: 'user-1',
    name: 'João Silva',
    email: 'admin@acai-erp-saas.com.br',
    password: 'admin123',
    role: 'admin',
    roleLabel: 'Administrador',
    avatar: null,
  },
  {
    id: 'user-2',
    name: 'Maria Caixa',
    email: 'caixa@acai-erp-saas.com.br',
    password: 'caixa123',
    role: 'caixa',
    roleLabel: 'Operador de Caixa',
    avatar: null,
  },
  {
    id: 'user-3',
    name: 'Pedro Cozinha',
    email: 'cozinha@acai-erp-saas.com.br',
    password: 'cozinha123',
    role: 'producao',
    roleLabel: 'Produção',
    avatar: null,
  },
];

// Permissões por papel
export const PERMISSIONS = {
  admin: [
    'dashboard', 'pos', 'orders', 'products', 'inventory',
    'customers', 'reports', 'settings', 'kitchen',
    'employees', 'suppliers', 'finance',
    // Novos módulos SaaS
    'integrations', 'crm', 'automations', 'fiscal', 'logistics', 'purchases', 'loyalty', 'subscription',
  ],
  caixa: ['dashboard', 'pos', 'orders', 'customers', 'kitchen'],
  producao: ['kitchen', 'orders'],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('acai_auth');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const login = (email, password) => {
    // Busca usuário pelo email
    const found = DEMO_USERS.find(u => u.email === email);

    if (found && (found.password === password || password?.length > 0)) {
      const u = {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        roleLabel: found.roleLabel,
      };
      setUser(u);
      localStorage.setItem('acai_auth', JSON.stringify(u));
      return true;
    }

    // Fallback: qualquer credencial válida → admin (modo demo)
    if (email && password) {
      const u = {
        id: `demo-${Date.now()}`,
        name: email.split('@')[0] || 'Usuário',
        email,
        role: 'admin',
        roleLabel: 'Administrador',
      };
      setUser(u);
      localStorage.setItem('acai_auth', JSON.stringify(u));
      return true;
    }

    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('acai_auth');
  };

  // Verifica se o usuário tem permissão para uma seção
  const hasPermission = (section) => {
    if (!user) return false;
    const perms = PERMISSIONS[user.role] || [];
    return perms.includes(section);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      hasPermission,
      role: user?.role || null,
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
