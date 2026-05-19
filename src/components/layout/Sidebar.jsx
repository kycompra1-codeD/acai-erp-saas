import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Package,
  Archive, Users, BarChart2, Settings, LogOut, Grape, X, ChefHat,
  UserCheck, Truck, TrendingUp, Shield, Heart,
  Globe, UserCog, Zap, FileText, BrainCircuit
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';

const navItems = [
  { group: 'Principal', items: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', section: 'dashboard' },
    { to: '/pos', icon: ShoppingCart, label: 'PDV / Novo Pedido', section: 'pos' },
    { to: '/orders', icon: ClipboardList, label: 'Pedidos', section: 'orders' },
    { to: '/kitchen', icon: ChefHat, label: 'Cozinha / Produção', section: 'kitchen' },
  ]},
  { group: 'ERP — Gestão', items: [
    { to: '/sales', icon: ClipboardList, label: 'Gestão de Vendas', section: 'sales', isNew: true },
    { to: '/products', icon: Package, label: 'Produtos', section: 'products' },
    { to: '/inventory', icon: Archive, label: 'Estoque', section: 'inventory' },
    { to: '/customers', icon: Users, label: 'Clientes', section: 'customers' },
    { to: '/employees', icon: UserCheck, label: 'Funcionários', section: 'employees' },
    { to: '/suppliers', icon: Truck, label: 'Fornecedores', section: 'suppliers' },
    { to: '/finance', icon: TrendingUp, label: 'Financeiro', section: 'finance' },
  ]},
  { group: 'SaaS — Novos Módulos', items: [
    { to: '/integrations', icon: Globe,    label: 'Hub de Integração', section: 'integrations', extensionId: 'hub', isNew: true },
    { to: '/logistics',    icon: Truck,    label: 'Expedição (Logística)', section: 'logistics', extensionId: 'logistics', isNew: true },
    { to: '/purchases',    icon: Archive,  label: 'Compras (Suprimentos)', section: 'purchases', isNew: true },
    { to: '/crm',          icon: UserCog,  label: 'CRM / Funil',       section: 'crm',          extensionId: 'crm', isNew: true },
    { to: '/automations',  icon: Zap,      label: 'Automações',        section: 'automations',  extensionId: 'ai', isNew: true },
    { to: '/fiscal',       icon: FileText, label: 'Fiscal (NF-e)',     section: 'fiscal',       extensionId: 'fiscal', isNew: true },
    { to: '/loyalty',      icon: Heart,    label: 'Fidelidade (PRO)',   section: 'customers',    extensionId: 'loyalty', isNew: true },
    { to: '/bi',           icon: BrainCircuit, label: 'B.I. Avançado',  section: 'reports',      extensionId: 'reports', isNew: true },
  ]},
  { group: 'Análises / Sistema', items: [
    { to: '/reports', icon: BarChart2, label: 'Relatórios', section: 'reports' },
    { to: '/settings/appearance', icon: LayoutDashboard, label: 'Aparência / Layout', section: 'settings', isNew: true },
    { to: '/permissions', icon: Shield, label: 'Permissões', section: 'settings' },
    { to: '/my-account', icon: UserCog, label: 'Minha Conta', section: 'settings' },
    { to: '/settings', icon: Settings, label: 'Configurações', section: 'settings' },
  ]},
];

const ROLE_COLORS = {
  admin:    { bg: 'rgba(124,58,237,0.15)', color: 'var(--primary-light)', label: 'Admin' },
  caixa:    { bg: 'rgba(236,72,153,0.15)', color: 'var(--accent)', label: 'Caixa' },
  producao: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Produção' },
};

export function Sidebar({ open, onClose }) {
  const { user, logout, hasPermission } = useAuth();
  const { activeExtensions } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleInfo = ROLE_COLORS[user?.role] || ROLE_COLORS.admin;

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          style={{ backdropFilter: 'blur(4px)' }}
        />
      )}

      <aside className={`sidebar ${open ? 'open' : ''}`} style={{ zIndex: 40 }}>
        {/* Logo */}
        <div className="sidebar-logo" style={{ justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Grape size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>Zullya ERP</div>
              <div style={{ fontSize: 10, color: 'var(--primary-light)', fontWeight: 700, letterSpacing: 1 }}>SaaS PRO</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" style={{ display: 'none' }} onClick={onClose} id="sidebar-close">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(group => {
            // Quando sem usuário (sessão limpa), mostra tudo como admin demo
            const visibleItems = group.items.filter(item => {
              const hasPerm = !item.section || !user || hasPermission(item.section);
              const isExtActive = !item.extensionId || !activeExtensions?.length || activeExtensions.includes(item.extensionId);
              return hasPerm && isExtActive;
            });
            if (visibleItems.length === 0) return null;

            const isSaasGroup = group.group.includes('SaaS');
            return (
              <div key={group.group}>
                <div className="nav-group-label" style={isSaasGroup ? { color: 'var(--primary-light)' } : {}}>
                  {group.group}
                </div>
                {visibleItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <item.icon size={18} />
                    {item.label}
                    {item.isNew && (
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: 9,
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 20,
                        letterSpacing: 0.5,
                      }}>
                        NEW
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 'var(--radius)',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {user?.name?.[0] ?? 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }} className="truncate">{user?.name}</div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                background: roleInfo.bg,
                color: roleInfo.color,
                padding: '1px 6px',
                borderRadius: 20,
              }}>
                {roleInfo.label}
              </span>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Sair" style={{ padding: 6 }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
