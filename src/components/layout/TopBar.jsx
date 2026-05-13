import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, AlertTriangle, Package, ShoppingCart, Check } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CompanySwitcher } from './CompanySwitcher';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const title = pageTitles[pathname] ?? 'Açaí ERP SaaS';
  const lowStockItems = inventory.filter(i => i.quantity <= i.minQuantity);
  const pendingOrdersList = orders.filter(o => o.status === 'pending');
  
  const lowStock = lowStockItems.length;
  const pendingOrders = pendingOrdersList.length;
  const totalAlerts = lowStock + pendingOrders;

  // Fecha o popover se clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

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
        {/* CompanySwitcher agora aparece a partir de sm (tablets) ou maior */}
        <div className="hidden sm:block">
          <CompanySwitcher />
        </div>

        <div className="flex items-center gap-2">
          {lowStock > 0 && (
            <div className="hidden md:flex items-center gap-1.5 badge badge-warning px-3 py-1 cursor-pointer" onClick={() => navigate('/inventory')}>
              <AlertTriangle size={12} />
              <span className="text-[10px] font-bold">{lowStock} alertas</span>
            </div>
          )}
          {pendingOrders > 0 && (
            <div className="badge badge-primary px-3 py-1 animate-pulse cursor-pointer" style={{ animationDuration: '2s' }} onClick={() => navigate('/orders')}>
              <span className="text-[10px] font-bold">{pendingOrders} novos</span>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />

        <div className="relative" ref={notifRef}>
          <button 
            className="btn btn-ghost btn-icon relative"
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              background: showNotifications ? 'var(--surface-hover)' : 'transparent'
            }}
          >
            <Bell size={20} />
            {totalAlerts > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-danger border-2 border-[var(--bg-2)]" />
            )}
          </button>

          {/* Popover de Notificações */}
          {showNotifications && (
            <div 
              className="absolute top-full right-0 mt-3 z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300" 
              style={{ 
                width: '300px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-light)',
                borderRadius: '14px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between">
                  <p style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text)', letterSpacing: '0.1em' }}>Notificações</p>
                  {totalAlerts > 0 && (
                    <span className="badge badge-primary" style={{ fontSize: '9px', padding: '2px 6px' }}>{totalAlerts} novas</span>
                  )}
                </div>
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="custom-scrollbar">
                {totalAlerts === 0 ? (
                  <div className="p-6 text-center">
                    <Check size={24} className="mx-auto mb-2" style={{ color: 'var(--success)' }} />
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tudo tranquilo por aqui!</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {/* Alertas de Pedidos Pendentes */}
                    {pendingOrders > 0 && (
                      <div className="p-2 border-b border-[var(--border)]">
                        <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary-light)', margin: '4px 8px', textTransform: 'uppercase' }}>Pedidos Pendentes</p>
                        {pendingOrdersList.slice(0, 3).map(order => (
                          <button
                            key={order.id}
                            onClick={() => { setShowNotifications(false); navigate('/orders'); }}
                            className="w-full flex gap-3 text-left p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <div className="mt-1" style={{ color: 'var(--primary)' }}>
                              <ShoppingCart size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>Pedido #{order.number}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="truncate">{order.customerName || 'Cliente Balcão'}</p>
                              <p style={{ fontSize: '10px', color: 'var(--primary-light)', marginTop: '2px' }}>Aguardando • {getWaitTime(order.createdAt)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Alertas de Estoque Baixo */}
                    {lowStock > 0 && (
                      <div className="p-2">
                        <p style={{ fontSize: '10px', fontWeight: '800', color: 'var(--warning)', margin: '4px 8px', textTransform: 'uppercase' }}>Estoque Baixo</p>
                        {lowStockItems.slice(0, 3).map(item => (
                          <button
                            key={item.id}
                            onClick={() => { setShowNotifications(false); navigate('/inventory'); }}
                            className="w-full flex gap-3 text-left p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                          >
                            <div className="mt-1" style={{ color: 'var(--warning)' }}>
                              <Package size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{item.name}</p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estoque atual: <span style={{ color: 'var(--danger)', fontWeight: '700' }}>{item.quantity} {item.unit}</span></p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {totalAlerts > 3 && (
                <div style={{ padding: '8px', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                  <p style={{ fontSize: '11px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    e mais {totalAlerts - 3} alertas...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
