import { Menu, Bell, AlertTriangle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CompanySwitcher } from './CompanySwitcher';

const pageTitles = {
  '/': 'Dashboard',
  '/pos': 'PDV — Novo Pedido',
  '/orders': 'Pedidos',
  '/products': 'Produtos & Cardápio',
  '/inventory': 'Controle de Estoque',
  '/customers': 'Clientes',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
};

function getWaitTime(createdAt) {
  if (!createdAt) return '—';
  const ts = new Date(createdAt).getTime();
  if (isNaN(ts)) return '—';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 0) return 'Agora';
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}min` : ''}`;
}

export function TopBar({ onMenuClick, pathname }) {
  const { inventory, orders } = useApp();
  const title = pageTitles[pathname] ?? 'Açaí ERP SaaS';
  const lowStock = inventory.filter(i => i.quantity <= i.minQuantity).length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <header className="topbar">
      <div className="flex items-center gap-3 overflow-hidden">
        <button className="btn btn-ghost btn-icon flex-shrink-0" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-black truncate leading-tight">{title}</h1>
          <p className="text-[10px] text-muted font-semibold truncate hidden sm:block">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        <div className="hidden lg:block">
          <CompanySwitcher />
        </div>

        <div className="flex items-center gap-2">
          {lowStock > 0 && (
            <div className="hidden md:flex items-center gap-1.5 badge badge-warning px-3 py-1">
              <AlertTriangle size={12} />
              <span className="text-[10px] font-bold">{lowStock} alertas</span>
            </div>
          )}
          {pendingOrders > 0 && (
            <div className="badge badge-primary px-3 py-1 animate-pulse" style={{ animationDuration: '2s' }}>
              <span className="text-[10px] font-bold">{pendingOrders} novos</span>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />

        <button className="btn btn-ghost btn-icon relative">
          <Bell size={20} />
          {(lowStock + pendingOrders) > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger border-2 border-[var(--bg-2)]" />
          )}
        </button>
      </div>
    </header>
  );
}
