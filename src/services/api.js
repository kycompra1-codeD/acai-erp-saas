// ============================================================
// Zullya ERP - Serviço de API
// Centraliza todas as chamadas ao backend Node.js
// ============================================================

const API_URL = import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api';

// ============================================================
// Helpers internos
// ============================================================

const getHeaders = () => {
  const token = localStorage.getItem('zullya_access_token');
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
  const refresh = localStorage.getItem('zullya_refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('zullya_access_token', data.dados.access_token);
    localStorage.setItem('zullya_refresh_token', data.dados.refresh_token);
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
    localStorage.removeItem('zullya_access_token');
    localStorage.removeItem('zullya_refresh_token');
    localStorage.removeItem('zullya_auth');
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
    localStorage.setItem('zullya_access_token', data.dados.access_token);
    localStorage.setItem('zullya_refresh_token', data.dados.refresh_token);
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
    localStorage.setItem('zullya_access_token', data.dados.access_token);
    localStorage.setItem('zullya_refresh_token', data.dados.refresh_token);
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
   * Solicitar redefinição de senha (envia e-mail)
   */
  esqueciSenha: async (email) => {
    return apiFetch('/auth/esqueci-senha', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Redefinir senha com token recebido por e-mail
   */
  redefinirSenha: async (email, token, nova_senha) => {
    return apiFetch('/auth/redefinir-senha', {
      method: 'POST',
      body: JSON.stringify({ email, token, nova_senha }),
    });
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
      localStorage.removeItem('zullya_access_token');
      localStorage.removeItem('zullya_refresh_token');
      localStorage.removeItem('zullya_auth');
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
// Produtos + Categorias
// ============================================================
export const produtosApi = {
  listar: (params = {}) => apiFetch('/produtos?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/produtos/${id}`),
  criar: (dados) => apiFetch('/produtos', { method: 'POST', body: JSON.stringify(dados) }),
  editar: (id, dados) => apiFetch(`/produtos/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  desativar: (id) => apiFetch(`/produtos/${id}`, { method: 'DELETE' }),

  categorias: {
    listar: () => apiFetch('/produtos/categorias'),
    criar: (dados) => apiFetch('/produtos/categorias', { method: 'POST', body: JSON.stringify(dados) }),
    editar: (id, dados) => apiFetch(`/produtos/categorias/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
    desativar: (id) => apiFetch(`/produtos/categorias/${id}`, { method: 'DELETE' }),
  },
};

// ============================================================
// Clientes
// ============================================================
export const clientesApi = {
  listar: (params = {}) => apiFetch('/clientes?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/clientes/${id}`),
  criar: (dados) => apiFetch('/clientes', { method: 'POST', body: JSON.stringify(dados) }),
  editar: (id, dados) => apiFetch(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  desativar: (id) => apiFetch(`/clientes/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Fornecedores
// ============================================================
export const fornecedoresApi = {
  listar: (params = {}) => apiFetch('/fornecedores?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/fornecedores/${id}`),
  criar: (dados) => apiFetch('/fornecedores', { method: 'POST', body: JSON.stringify(dados) }),
  editar: (id, dados) => apiFetch(`/fornecedores/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  desativar: (id) => apiFetch(`/fornecedores/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Funcionários
// ============================================================
export const funcionariosApi = {
  listar: (params = {}) => apiFetch('/funcionarios?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/funcionarios/${id}`),
  criar: (dados) => apiFetch('/funcionarios', { method: 'POST', body: JSON.stringify(dados) }),
  editar: (id, dados) => apiFetch(`/funcionarios/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  desativar: (id) => apiFetch(`/funcionarios/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Pedidos / PDV
// ============================================================
export const pedidosApi = {
  listar: (params = {}) => apiFetch('/pedidos?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/pedidos/${id}`),
  criar: (dados) => apiFetch('/pedidos', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarStatus: (id, status) => apiFetch(`/pedidos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancelar: (id) => apiFetch(`/pedidos/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Estoque (insumos + movimentações)
// ============================================================
export const estoqueApi = {
  listar: (params = {}) => apiFetch('/estoque?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/estoque/${id}`),
  criar: (dados) => apiFetch('/estoque', { method: 'POST', body: JSON.stringify(dados) }),
  editar: (id, dados) => apiFetch(`/estoque/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  remover: (id) => apiFetch(`/estoque/${id}`, { method: 'DELETE' }),
  movimentacoes: (id, params = {}) => apiFetch(`/estoque/${id}/movimentacoes?` + new URLSearchParams(params)),
  registrarMovimentacao: (id, dados) => apiFetch(`/estoque/${id}/movimentacoes`, { method: 'POST', body: JSON.stringify(dados) }),
};

// ============================================================
// Compras
// ============================================================
export const comprasApi = {
  listar: (params = {}) => apiFetch('/compras?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/compras/${id}`),
  criar: (dados) => apiFetch('/compras', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarStatus: (id, status) => apiFetch(`/compras/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  cancelar: (id) => apiFetch(`/compras/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Financeiro (lançamentos + DRE)
// ============================================================
export const financeiroApi = {
  listar: (params = {}) => apiFetch('/financeiro?' + new URLSearchParams(params)),
  buscar: (id) => apiFetch(`/financeiro/${id}`),
  criar: (dados) => apiFetch('/financeiro', { method: 'POST', body: JSON.stringify(dados) }),
  editar: (id, dados) => apiFetch(`/financeiro/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluir: (id) => apiFetch(`/financeiro/${id}`, { method: 'DELETE' }),
  dre: (data_inicio, data_fim) => apiFetch(`/financeiro/dre?data_inicio=${data_inicio}&data_fim=${data_fim}`),
};

// ============================================================
// Dashboard
// ============================================================
export const dashboardApi = {
  kpis: () => apiFetch('/dashboard'),
  resumoMes: () => apiFetch('/dashboard/resumo-mes'),
};

// ============================================================
// Relatórios
// ============================================================
export const relatoriosApi = {
  vendas: (params) => apiFetch('/relatorios/vendas?' + new URLSearchParams(params)),
  produtos: (params) => apiFetch('/relatorios/produtos?' + new URLSearchParams(params)),
  clientes: (params) => apiFetch('/relatorios/clientes?' + new URLSearchParams(params)),
  financeiro: (params) => apiFetch('/relatorios/financeiro?' + new URLSearchParams(params)),
  estoque: () => apiFetch('/relatorios/estoque'),
  funcionarios: () => apiFetch('/relatorios/funcionarios'),
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
