// ============================================================
// Açaí ERP - Serviço de API
// Centraliza todas as chamadas ao backend Node.js
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ============================================================
// Helpers internos
// ============================================================

const getHeaders = () => {
  const token = localStorage.getItem('acai_access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.mensagem || `Erro ${res.status}`);
  }
  return data;
};

// Renovar token automaticamente se expirado
const refreshTokenIfNeeded = async () => {
  const refresh = localStorage.getItem('acai_refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('acai_access_token', data.dados.access_token);
    localStorage.setItem('acai_refresh_token', data.dados.refresh_token);
    return true;
  } catch {
    return false;
  }
};

// Fetch com renovação automática de token (retry 1x se 401)
const apiFetch = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: getHeaders(),
  });

  // Se token expirou, tenta renovar e repetir
  if (res.status === 401) {
    const renewed = await refreshTokenIfNeeded();
    if (renewed) {
      return fetch(`${API_URL}${path}`, {
        ...options,
        headers: getHeaders(),
      }).then(handleResponse);
    }
    // Sessão expirada — limpar e redirecionar
    localStorage.removeItem('acai_access_token');
    localStorage.removeItem('acai_refresh_token');
    localStorage.removeItem('acai_auth');
    window.location.href = '/login';
    throw new Error('Sessão expirada.');
  }

  return handleResponse(res);
};

// ============================================================
// Auth
// ============================================================
export const authApi = {
  /**
   * Login com e-mail e senha
   * Retorna: { access_token, refresh_token, usuario, empresa }
   */
  login: async (email, senha) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
    // Salvar tokens
    localStorage.setItem('acai_access_token', data.dados.access_token);
    localStorage.setItem('acai_refresh_token', data.dados.refresh_token);
    return data.dados;
  },

  /**
   * Registro de nova empresa (trial de 14 dias)
   */
  registro: async (payload) => {
    const data = await apiFetch('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('acai_access_token', data.dados.access_token);
    localStorage.setItem('acai_refresh_token', data.dados.refresh_token);
    return data.dados;
  },

  /**
   * Dados do usuário logado
   */
  me: async () => {
    const data = await apiFetch('/auth/me');
    return data.dados;
  },

  /**
   * Logout — revoga o refresh token no servidor
   */
  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar erros de logout
    } finally {
      localStorage.removeItem('acai_access_token');
      localStorage.removeItem('acai_refresh_token');
      localStorage.removeItem('acai_auth');
    }
  },
};

// ============================================================
// Usuários
// ============================================================
export const usuariosApi = {
  listar: () => apiFetch('/usuarios'),
  criar: (dados) => apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(dados) }),
  editar: (id, dados) => apiFetch(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  desativar: (id) => apiFetch(`/usuarios/${id}`, { method: 'DELETE' }),
  redefinirSenha: (id, nova_senha) =>
    apiFetch(`/usuarios/${id}/redefinir-senha`, { method: 'POST', body: JSON.stringify({ nova_senha }) }),
};

// ============================================================
// Health check (verifica se o backend está disponível)
// ============================================================
export const checkBackend = async () => {
  try {
    const res = await fetch(`${API_URL.replace('/api', '')}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
};
