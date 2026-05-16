import { useState } from 'react';
import { Shield, Check, X, Save, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const MODULES = [
  { key: 'dashboard',  label: 'Dashboard',      icon: '📊', desc: 'Visão geral e KPIs' },
  { key: 'pos',        label: 'PDV / Caixa',    icon: '🛒', desc: 'Ponto de venda' },
  { key: 'orders',     label: 'Pedidos',         icon: '📋', desc: 'Gerenciar pedidos' },
  { key: 'kitchen',    label: 'Cozinha',         icon: '🍳', desc: 'Tela de produção' },
  { key: 'products',   label: 'Produtos',        icon: '🍇', desc: 'Cadastro de produtos' },
  { key: 'inventory',  label: 'Estoque',         icon: '📦', desc: 'Controle de estoque' },
  { key: 'customers',  label: 'Clientes',        icon: '👥', desc: 'Cadastro de clientes' },
  { key: 'employees',  label: 'Funcionários',    icon: '👤', desc: 'Gestão da equipe' },
  { key: 'suppliers',  label: 'Fornecedores',    icon: '🚚', desc: 'Cadastro de fornecedores' },
  { key: 'finance',    label: 'Financeiro',      icon: '💰', desc: 'Lançamentos e relatórios' },
  { key: 'reports',    label: 'Relatórios',      icon: '📈', desc: 'Análise de desempenho' },
  { key: 'settings',   label: 'Configurações',   icon: '⚙️', desc: 'Configurações do sistema' },
];

const ROLE_PRESETS = {
  admin:     { label: 'Administrador',        color: '#7C3AED', modules: MODULES.map(m => m.key) },
  gerente:   { label: 'Gerente',              color: '#3b82f6', modules: ['dashboard','pos','orders','kitchen','products','inventory','customers','reports'] },
  caixa:     { label: 'Operador de Caixa',   color: '#10b981', modules: ['dashboard','pos','orders','customers','kitchen'] },
  producao:  { label: 'Produção / Cozinha',  color: '#f59e0b', modules: ['kitchen','orders'] },
  atendente: { label: 'Atendente',            color: '#ec4899', modules: ['dashboard','pos','orders','customers'] },
};

const PERM_STORAGE_KEY = 'zullya_employee_permissions';
const PERM_STORAGE_KEY_LEGACY = 'acai_employee_permissions';

function loadPerms() {
  try {
    const legacy = localStorage.getItem(PERM_STORAGE_KEY_LEGACY);
    if (legacy) {
      localStorage.setItem(PERM_STORAGE_KEY, legacy);
      localStorage.removeItem(PERM_STORAGE_KEY_LEGACY);
    }
    return JSON.parse(localStorage.getItem(PERM_STORAGE_KEY) || '{}');
  } catch { return {}; }
}
function savePerms(perms) {
  try { localStorage.setItem(PERM_STORAGE_KEY, JSON.stringify(perms)); } catch {}
}

export default function Permissions() {
  const { employees = [] } = useApp();
  const { user } = useAuth();
  const [perms, setPerms] = useState(loadPerms);
  const [expanded, setExpanded] = useState(null);

  const getEmpPerms = (empId, role) => {
    if (perms[empId]) return perms[empId];
    return ROLE_PRESETS[role]?.modules || ROLE_PRESETS.atendente.modules;
  };

  const toggleModule = (empId, role, modKey) => {
    const current = getEmpPerms(empId, role);
    const updated = current.includes(modKey)
      ? current.filter(m => m !== modKey)
      : [...current, modKey];
    const newPerms = { ...perms, [empId]: updated };
    setPerms(newPerms);
    savePerms(newPerms);
  };

  const applyPreset = (empId, presetKey) => {
    const preset = ROLE_PRESETS[presetKey];
    if (!preset) return;
    const newPerms = { ...perms, [empId]: [...preset.modules] };
    setPerms(newPerms);
    savePerms(newPerms);
    toast.success(`Perfil "${preset.label}" aplicado!`);
  };

  const saveAll = () => {
    savePerms(perms);
    toast.success('Permissões salvas com sucesso!');
  };

  if (!user || !['admin', 'gerente'].includes(user.role)) {
    return (
      <div className="empty-state" style={{ padding: '80px 0' }}>
        <Shield size={48} style={{ opacity: 0.2 }} />
        <p>Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="animate-fade space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield size={26} color="var(--primary-light)" /> Controle de Permissões
          </h1>
          <p className="text-sm text-muted mt-1">Defina quais módulos cada funcionário pode acessar</p>
        </div>
        <button className="btn btn-primary" onClick={saveAll}><Save size={16} /> Salvar Tudo</button>
      </div>

      {/* Legend */}
      <div className="glass-card p-4">
        <p className="text-xs font-bold text-muted uppercase mb-3" style={{ letterSpacing: '0.06em' }}>Perfis Pré-definidos</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
            <span key={key} style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: `${preset.color}20`, color: preset.color, border: `1px solid ${preset.color}40` }}>
              {preset.label}
            </span>
          ))}
        </div>
      </div>

      {/* Employees */}
      {employees.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <Users size={40} style={{ opacity: 0.2 }} />
          <p>Nenhum funcionário cadastrado</p>
        </div>
      ) : employees.map(emp => {
        const empPerms = getEmpPerms(emp.id, emp.role);
        const isExpanded = expanded === emp.id;
        const preset = ROLE_PRESETS[emp.role];
        const moduleCount = empPerms.length;

        return (
          <div key={emp.id} className="glass-card overflow-hidden">
            {/* Header */}
            <div
              style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
              onClick={() => setExpanded(isExpanded ? null : emp.id)}
            >
              {emp.photo ? (
                <img src={emp.photo} alt={emp.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>
                  {(emp.name || '?')[0].toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{emp.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 10, background: `${preset?.color || '#94a3b8'}18`, color: preset?.color || '#94a3b8', fontWeight: 700 }}>
                    {preset?.label || emp.role}
                  </span>
                  <span style={{ marginLeft: 8 }}>{moduleCount} módulo(s) ativos</span>
                </div>
              </div>
              {/* Preset selector */}
              <select
                className="input-field"
                style={{ width: 180, fontSize: 12 }}
                value=""
                onChange={e => { if (e.target.value) applyPreset(emp.id, e.target.value); }}
                onClick={e => e.stopPropagation()}
              >
                <option value="">Aplicar perfil...</option>
                {Object.entries(ROLE_PRESETS).map(([k, p]) => (
                  <option key={k} value={k}>{p.label}</option>
                ))}
              </select>
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {/* Modules grid */}
            {isExpanded && (
              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {MODULES.map(mod => {
                  const hasAccess = empPerms.includes(mod.key);
                  return (
                    <button
                      key={mod.key}
                      onClick={() => toggleModule(emp.id, emp.role, mod.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 10,
                        background: hasAccess ? `${preset?.color || 'var(--primary)'}12` : 'var(--surface-2)',
                        border: `1px solid ${hasAccess ? (preset?.color || 'var(--primary)') + '40' : 'var(--border)'}`,
                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{mod.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: hasAccess ? (preset?.color || 'var(--primary-light)') : 'var(--text)' }}>{mod.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{mod.desc}</div>
                      </div>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: hasAccess ? (preset?.color || 'var(--primary)') : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {hasAccess ? <Check size={11} color="#fff" /> : <X size={11} color="var(--text-muted)" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
