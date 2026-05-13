import { useMemo } from 'react';
import {
  TrendingUp, ShoppingCart, Users, Package, ArrowUp, ArrowDown,
  AlertTriangle, Clock, Globe, FileText, Cpu, Crown
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useAppearance } from '../contexts/AppearanceContext';
import { format } from 'date-fns';

const ORDER_STATUS_LABEL = {
  pending: 'Aguardando',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};
const ORDER_STATUS_CLASS = {
  pending: 'warning',
  preparing: 'info',
  ready: 'success',
  delivered: 'muted',
  cancelled: 'danger', 
};

function fmt(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '10px 14px', 
    }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-light)' }}>{fmt(payload[0].value)}</p>
      {payload[1] && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{payload[1].value} pedidos</p>}
    </div>
  );
};

export default function Dashboard() {
  const { getDashboardStats, orders, inventory, settings } = useApp();
  const { dashboardOrder } = useAppearance();
  const stats = useMemo(() => getDashboardStats(), [getDashboardStats]);
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toDateString();
      const dayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === dateStr && o.status !== 'cancelled');
      return {
        date: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        sales: dayOrders.reduce((s, o) => s + o.total, 0),
        orders: dayOrders.length,
      };
    });
  }, [orders]);

  const recentOrders = orders.slice(0, 6);
  const lowStockItems = inventory.filter(i => i.quantity <= i.minQuantity).slice(0, 4);

  const renderWidget = (id) => {
    switch (id) {
      case 'stats':
        return (
          <div key="stats" className="grid-4 mb-6">
            <StatCard 
              label="Vendas Hoje" 
              value={fmt(stats.todaySales)} 
              icon={<TrendingUp size={20} />} 
              iconBg="rgba(124,58,237,0.15)" 
              iconColor="var(--primary-light)" 
              change={stats.salesChange} 
              changeLabel="vs ontem" 
            />
            <StatCard 
              label="Pedidos Hoje" 
              value={stats.todayOrders} 
              icon={<ShoppingCart size={20} />} 
              iconBg="rgba(236,72,153,0.15)" 
              iconColor="var(--accent)" 
              change={null} 
              changeLabel={`${stats.pendingOrders} aguardando`} 
            />
            <StatCard 
              label="Ticket Médio" 
              value={fmt(stats.avgTicket)} 
              icon={<Package size={20} />} 
              iconBg="rgba(16,185,129,0.15)" 
              iconColor="var(--success)" 
              change={null} 
              changeLabel="por pedido" 
            />
            <StatCard 
              label="Clientes" 
              value={stats.totalCustomers} 
              icon={<Users size={20} />} 
              iconBg="rgba(59,130,246,0.15)" 
              iconColor="var(--info)" 
              change={null} 
              changeLabel="cadastrados" 
            />
          </div>
        );
      case 'sales_chart':
        return (
          <div key="sales_chart" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>
            <div className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>Vendas — Últimos 7 dias</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Faturamento diário</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={3} dot={false} activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Top Produtos</h3>
              {stats.topProducts.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sem dados</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {stats.topProducts.map((p) => (
                    <div key={p.name}>
                      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.qty} un.</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${(p.qty / stats.topProducts[0].qty) * 100}%`, background: `linear-gradient(90deg, var(--primary), var(--accent))`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'recent_orders':
        return (
          <div key="recent_orders" className="glass-card mb-6">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pedidos Recentes</h3>
            <div className="grid-2 gap-4">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`status-dot ${order.status}`} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>#{order.number} — {order.customerName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(new Date(order.createdAt), 'HH:mm')} · {order.type}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(order.total)}</div>
                    <span className={`badge badge-${ORDER_STATUS_CLASS[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'inventory_alert':
        return (
          <div key="inventory_alert" className="glass-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Alertas de Estoque Crítico</h3>
              {lowStockItems.length > 0 && <span className="badge badge-warning"><AlertTriangle size={10} /> {lowStockItems.length} itens</span>}
            </div>
            {lowStockItems.length === 0 ? <p className="text-center text-muted p-4">Estoque OK ✓</p> : (
              <div className="grid-4 gap-4">
                {lowStockItems.map(item => (
                  <div key={item.id} className={`p-3 rounded-xl border ${item.quantity === 0 ? 'border-danger/30 bg-danger-bg/10' : 'border-border bg-surface-2'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle size={16} className={item.quantity === 0 ? 'text-danger' : 'text-warning'} />
                      <div className="font-semibold text-sm truncate">{item.name}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted">Qtd: {item.quantity}</span>
                      <span className={`badge badge-${item.quantity === 0 ? 'danger' : 'warning'}`}>{item.quantity === 0 ? 'Zerar' : 'Baixo'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'loyalty_summary':
        return (
          <div key="loyalty_summary" className="glass-card mb-6 border-dashed border-primary/40 opacity-80">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-primary-glow rounded-lg text-primary-light"><Crown size={18} /></div>
               <h3 style={{ fontSize: 16, fontWeight: 700 }}>Clube de Fidelidade</h3>
            </div>
            <p className="text-xs text-muted">Acompanhe o engajamento dos seus clientes com o programa de pontos aqui.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade">
      {/* System Status Bar — Full detail matching screenshots */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
        padding: '8px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', letterSpacing: '0.05em' }}>Store Live</span>
        </div>
        <span style={{ color: 'var(--border-light)', fontSize: 12 }}>●</span>
        <div className="flex items-center gap-2">
          <Globe size={12} style={{ color: 'var(--primary-light)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Marketplace Hub: 3 Canais</span>
        </div>
        <span style={{ color: 'var(--border-light)', fontSize: 12 }}>●</span>
        <div className="flex items-center gap-2">
          <FileText size={12} style={{ color: 'var(--success)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Sefaz: Online</span>
        </div>
        <span style={{ color: 'var(--border-light)', fontSize: 12 }}>●</span>
        <div className="flex items-center gap-2">
          <Cpu size={12} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Impressora: Conectada</span>
        </div>
        <span style={{ color: 'var(--border-light)', fontSize: 12 }}>●</span>
        <div 
          className="flex items-center gap-2" 
          style={{ cursor: 'pointer' }}
          onClick={() => window.location.href='/subscription'}
        >
          <Crown size={12} style={{ color: 'var(--primary-light)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-light)' }}>Plano: {settings?.planId?.toUpperCase() || 'PRO'}</span>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Última sincronização: {format(new Date(), 'HH:mm:ss')}
        </div>
      </div>

      {/* Widgets Reordenáveis */}
      {dashboardOrder.map(widgetId => renderWidget(widgetId))}
    </div>
  );
}

function StatCard({ label, value, icon, iconBg, iconColor, change, changeLabel }) {
  const isUp = change > 0;
  return (
    <div className="stat-card">
      {/* Top row: icon + % change */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        {change !== null && change !== undefined && (
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: isUp ? 'var(--success)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {isUp ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Value */}
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </div>

      {/* Sub-info */}
      {changeLabel && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={10} />
          {changeLabel}
        </div>
      )}
    </div>
  );
}
