import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search, Clock, ChevronRight, Filter, Plus, Minus,
  Trash2, CheckCircle, Package, RotateCcw, Printer,
  Truck, RotateCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { printService } from '../services/printService';
import toast from 'react-hot-toast';

const STATUSES = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Aguardando', color: '#f59e0b' },
  { key: 'preparing', label: 'Preparando', color: '#3b82f6' },
  { key: 'ready', label: 'Prontos', color: '#10b981' },
  { key: 'delivered', label: 'Entregues', color: '#94a3b8' },
  { key: 'cancelled', label: 'Cancelados', color: '#ef4444' },
];

const NEXT_STATUS = { pending: 'preparing', preparing: 'ready', ready: 'delivered' };
const PREV_STATUS = { preparing: 'pending', ready: 'preparing', delivered: 'ready' };

const STATUS_LABEL = {
  pending: 'AGUARDANDO', preparing: 'PREPARANDO', ready: 'PRONTO',
  delivered: 'ENTREGUE', cancelled: 'CANCELADO',
};

const STATUS_COLORS = {
  pending: '#f59e0b', preparing: '#3b82f6', ready: '#10b981',
  delivered: '#94a3b8', cancelled: '#ef4444',
};

// Cor do botão de avanço por status — igual ao sistema antigo
const ADVANCE_BTN = {
  pending:   { bg: '#f59e0b', label: '⚡ INICIAR PREPARO' },
  preparing: { bg: '#3b82f6', label: '✓ MARCAR PRONTO' },
  ready:     { bg: '#10b981', label: '🚀 CONFIRMAR ENTREGA' },
};

function fmt(v) { return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

function getWaitTime(createdAt) {
  if (!createdAt) return '0min';
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (isNaN(mins) || mins < 0) return '0min';
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}min` : ''}`;
}

function fmtTime(ts) {
  if (!ts) return null;
  try { return format(new Date(ts), 'HH:mm', { locale: ptBR }); } catch { return null; }
}

function OrderTimeline({ order }) {
  const steps = [
    { label: 'Pedido',   ts: order.createdAt,   icon: '📋', done: true },
    { label: 'Preparo',  ts: order.preparingAt,  icon: '🍳', done: !!order.preparingAt },
    { label: 'Pronto',   ts: order.readyAt,      icon: '✅', done: !!order.readyAt },
    { label: 'Entregue', ts: order.deliveredAt,  icon: '🚀', done: !!order.deliveredAt },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingTop: 10, borderTop: '1px solid var(--border)', marginTop: 10 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: s.done ? 1 : 0.25 }}>
          <div style={{ fontSize: 15 }}>{s.icon}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 2 }}>{s.label}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{fmtTime(s.ts) || '—'}</div>
        </div>
      ))}
    </div>
  );
}

export default function Orders() {
  const { orders, updateOrderStatus, updateOrder } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);

  const filtered = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return orders.filter(o => {
      const matchStatus = filter === 'all' || o.status === filter;
      const matchSearch = search === '' ||
        (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        String(o.number || '').includes(search);
      return matchStatus && matchSearch;
    });
  }, [orders, filter, search]);

  const handleAdvance = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await updateOrderStatus(order.id, next);
      toast.success(`Pedido #${order.number} → ${STATUS_LABEL[next]}`);
    } catch { toast.error('Erro ao atualizar status.'); }
  };

  const handleUndo = async (order) => {
    const prev = PREV_STATUS[order.status];
    if (!prev) return;
    try {
      await updateOrderStatus(order.id, prev);
      if (prev === 'pending') updateOrder(order.id, { preparingAt: null });
      if (prev === 'preparing') updateOrder(order.id, { readyAt: null });
      if (prev === 'ready') updateOrder(order.id, { deliveredAt: null });
      toast.success(`Revertido para ${STATUS_LABEL[prev]}`);
    } catch { toast.error('Erro ao reverter status.'); }
  };

  const handleCancel = async () => {
    try {
      await updateOrderStatus(cancelTarget.id, 'cancelled');
      toast.success(`Pedido #${cancelTarget.number} cancelado`);
      setCancelTarget(null);
    } catch { toast.error('Erro ao cancelar pedido.'); }
  };

  const handleRevert = async (order) => {
    try {
      await updateOrderStatus(order.id, 'pending');
      updateOrder(order.id, { deliveredAt: null, cancelledAt: null });
      toast.success(`Pedido #${order.number} revertido`);
    } catch { toast.error('Erro ao reativar pedido.'); }
  };

  const counts = useMemo(() => {
    const c = {};
    if (Array.isArray(orders)) orders.forEach(o => { if (o?.status) c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const totalRevenue = useMemo(() =>
    (Array.isArray(orders) ? orders : []).filter(o => o.status === 'delivered').reduce((s, o) => s + (o.total || 0), 0),
  [orders]);

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} style={{ color: 'var(--primary-light)' }} />
            Gestão de Pedidos
          </h1>
          <p className="page-subtitle">Acompanhe e gerencie todos os pedidos em tempo real</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/pos')}>
          <Plus size={16} /> Novo Pedido (POS)
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total de Pedidos',  value: orders.length, color: 'var(--primary-light)', Icon: Package },
          { label: 'Aguardando',        value: counts['pending'] || 0, color: '#f59e0b', Icon: Clock },
          { label: 'Em Preparo',        value: counts['preparing'] || 0, color: '#3b82f6', Icon: RotateCcw },
          { label: 'Faturamento',       value: fmt(totalRevenue), color: 'var(--success)', Icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${s.color}`, borderRadius: 'var(--radius)',
            padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.Icon size={16} color={s.color} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: filter === s.key ? (s.color || 'var(--primary)') : 'var(--border)',
                background: filter === s.key ? `${s.color || 'var(--primary)'}18` : 'transparent',
                color: filter === s.key ? (s.color || 'var(--primary-light)') : 'var(--text-muted)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {s.label}
              {s.key !== 'all' && counts[s.key] > 0 && (
                <span style={{
                  background: s.color, color: '#fff',
                  borderRadius: 99, fontSize: 10, fontWeight: 800,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>{counts[s.key]}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', width: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            style={{
              width: '100%', padding: '8px 12px 8px 32px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)', fontSize: 13, color: 'var(--text)',
              outline: 'none',
            }}
            placeholder="Buscar pedido..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid de Pedidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map((order, idx) => {
          const sc = STATUS_COLORS[order.status] || 'var(--primary)';
          const btn = ADVANCE_BTN[order.status];
          const isActive = ['pending', 'preparing', 'ready'].includes(order.status);
          const isDone = ['delivered', 'cancelled'].includes(order.status);

          return (
            <div key={order.id || idx} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${sc}`,
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              opacity: isDone ? 0.75 : 1,
              transition: 'opacity 0.2s',
            }}>
              {/* Card Header */}
              <div style={{
                padding: '9px 14px',
                background: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                    #{String(order.number || 0).padStart(4, '0')}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
                    padding: '2px 8px', borderRadius: 99,
                    background: `${sc}22`, color: sc,
                    border: `1px solid ${sc}44`,
                  }}>
                    {STATUS_LABEL[order.status] || 'PENDENTE'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Clock size={11} />
                  {isActive ? getWaitTime(order.createdAt) : fmtTime(order.createdAt)}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Cliente + Preço */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                      {order.customerName || 'Consumidor Final'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {order.type === 'delivery' ? '🛵 Delivery' : order.type === 'retirada' ? '🚶 Retirada' : '🏪 Balcão'}
                    </div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--primary-light)', whiteSpace: 'nowrap' }}>
                    {fmt(order.total || 0)}
                  </div>
                </div>

                {/* Itens */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {order.items?.slice(0, 3).map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 700 }}>{item.quantity}×</span> {item.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <div style={{ fontSize: 11, color: 'var(--primary-light)', fontWeight: 600 }}>
                      + {order.items.length - 3} itens
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <OrderTimeline order={order} />

                {/* Ações */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                  {btn && (
                    <button
                      onClick={() => handleAdvance(order)}
                      style={{
                        width: '100%', padding: '10px 0',
                        background: btn.bg, color: '#fff',
                        border: 'none', borderRadius: 'var(--radius-sm)',
                        fontWeight: 800, fontSize: 12, letterSpacing: '0.04em',
                        cursor: 'pointer', transition: 'opacity 0.15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                      onMouseOut={e => e.currentTarget.style.opacity = '1'}
                    >
                      {btn.label}
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Imprimir */}
                      <button
                        onClick={() => printService.printOrder(order)}
                        title="Imprimir"
                        style={iconBtnStyle}
                      >
                        <Printer size={13} />
                      </button>
                      {/* Rastreio */}
                      <button
                        onClick={() => navigate(`/logistics?id=${order.id}`)}
                        title="Logística"
                        style={iconBtnStyle}
                      >
                        <Truck size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Desfazer */}
                      {PREV_STATUS[order.status] && (
                        <button
                          onClick={() => handleUndo(order)}
                          title="Desfazer"
                          style={{ ...iconBtnStyle, color: '#f59e0b', borderColor: '#f59e0b44' }}
                        >
                          <RotateCw size={13} />
                        </button>
                      )}
                      {/* Revert (admin) */}
                      {isDone && ['admin', 'gerente'].includes(user?.role) && (
                        <button
                          onClick={() => handleRevert(order)}
                          title="Reativar"
                          style={{ ...iconBtnStyle, color: 'var(--primary-light)', borderColor: 'var(--border-light)' }}
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                      {/* Cancelar */}
                      {!isDone && (
                        <button
                          onClick={() => setCancelTarget(order)}
                          title="Cancelar"
                          style={{ ...iconBtnStyle, color: '#ef4444', borderColor: '#ef444433' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <Filter size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
            <p>Nenhum pedido encontrado</p>
          </div>
        )}
      </div>

      {/* Modal Cancelar */}
      {cancelTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid #ef444466', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%' }}>
            <h3 style={{ fontWeight: 700, color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trash2 size={18} /> Cancelar pedido?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Pedido <strong>#{cancelTarget.number}</strong> — {cancelTarget.customerName}. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setCancelTarget(null)}
                style={{ flex: 1, padding: '10px', background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                style={{ flex: 1, padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = {
  padding: '6px 8px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
};
