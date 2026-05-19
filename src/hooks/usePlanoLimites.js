import { useAuth } from '../contexts/AuthContext';

const MODULOS_TODOS = [
  'vendas', 'estoque', 'clientes', 'financeiro', 'crm', 'nfe',
  'relatorios', 'metas', 'multi_filial', 'api_acesso', 'suporte_prioritario',
  'compras', 'logistica', 'fidelidade', 'automacoes', 'funcionarios'
];

export function usePlanoLimites() {
  const { empresa, user } = useAuth();

  // Admin demo / modo demo: acesso total
  if (user?.nivel_permissao === 'admin_demo' || user?.nivel_permissao === 'master') {
    return {
      temModulo: () => true,
      maxUsuarios: empresa?.plano?.max_usuarios ?? 999,
      modulosPermitidos: MODULOS_TODOS,
      planoNome: empresa?.plano_nome || empresa?.nome_plano || 'Starter',
    };
  }

  const modulosPermitidos = empresa?.plano?.modulos ?? empresa?.modulos ?? MODULOS_TODOS;

  return {
    temModulo: (modulo) => {
      if (!modulosPermitidos || modulosPermitidos.length === 0) return true;
      return modulosPermitidos.includes(modulo);
    },
    maxUsuarios: empresa?.plano?.max_usuarios ?? 3,
    modulosPermitidos,
    planoNome: empresa?.plano_nome || empresa?.plano?.nome || 'Starter',
  };
}
