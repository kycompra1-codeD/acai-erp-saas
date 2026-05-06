import { useState, useEffect, useCallback } from 'react';
import {
  ChefHat, Clock, CheckCircle, Printer, RefreshCw,
  AlertCircle, Flame, Package, Bell, Wifi
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { printService } from '../services/printService';
import { eventBus, EVENTS } from '../services/eventBus';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:   { label: 'Aguardando',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  next: 'preparing', nextLabel: '🔥 Iniciar Preparo' },
  preparing: { label: 'Preparando', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  next: 'ready',     nextLabel: '✅ Marcar Pronto'   },
  ready:     { label: 'Pronto!',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', next: 'delivered', nextLabel: '🛵 Confirmar Entrega' },
};

const TYPE_EMOJI = {
  balcão:   '🏪',
  delivery: '🛵',
  retirada: '🚶',
};

function fmt(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function timeAgo(iso) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
  } catch {
    return '—';
  }
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function OrderTimeline({ order }) {
  const steps = [
    { label: 'Pedido', ts: order.createdAt, icon: '📋', done: true },
    { label: 'Preparo', ts: order.preparingAt, icon: '🍳', done: !!order.preparingAt },
    { label: 'Pronto', ts: order.readyAt, icon: '✅', done: !!order.readyAt },
    { label: 'Entregue', ts: order.deliveredAt, icon: '🚀', done: !!order.deliveredAt },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: s.done ? 1 : 0.3 }}>
          <div style={{ fontSize: 14 }}>{s.icon}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: s.done ? 'var(--text)' : 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>{s.label}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{s.ts ? fmtTime(s.ts) : '—'}</div>
        </div>
      ))}
    </div>
  );
}

// Cartão de pedido na cozinha
function KitchenCard({ order, onAdvance }) {
  const cfg = STATUS_CONFIG[order.status];
  const isUrgent = order.status === 'pending' &&
    (Date.now() - new Date(order.createdAt).getTime()) > 5 * 60 * 1000; // >5min

  return (
    <div className={`glass-card border-2 transition-all duration-300 relative group ${isUrgent ? 'border-danger/50 shadow-lg shadow-danger/10' : ''}`}
      style={{
        borderColor: isUrgent ? 'var(--danger)' : `${cfg.color}40`,
        animation: isUrgent ? 'pulse-urgent 2s ease-in-out infinite' : undefined,
      }}>
      
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity"
        style={{ from: `${cfg.color}20`, to: 'transparent' }} />

      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-white/5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tighter text-white">
                #{String(order.number).padStart(4, '0')}
              </span>
              {isUrgent && (
                <div className="bg-danger/20 text-danger px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest animate-pulse border border-danger/30">
                  Urgente
                </div>
              )}
            </div>
            <div className="text-[11px] font-bold text-muted uppercase tracking-widest mt-1 flex items-center gap-2">
              <span>{TYPE_EMOJI[order.type] || '🏪'} {order.type}</span>
              <span className="opacity-20">•</span>
              <span className="text-white/60">{order.customerName}</span>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
            {cfg.label}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Itens */}
        <div className="space-y-2">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group/item hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-primary/20 text-primary-light flex items-center justify-center text-xs font-black border border-primary/30">
                  {item.quantity}
                </span>
                <span className="text-sm font-bold text-white/90">{item.name}</span>
              </div>
              {item.weightKg && (
                <span className="text-[10px] font-black text-muted-foreground bg-white/5 px-2 py-1 rounded-lg">
                  {Number(item.weightKg).toFixed(3)} KG
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Observações */}
        {order.notes && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Observações</div>
            <div className="text-xs text-amber-200/80 font-medium leading-relaxed">{order.notes}</div>
          </div>
        )}

        {/* Info & Stats */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-widest">
            <Clock size={12} className="opacity-40" />
            {timeAgo(order.createdAt)}
          </div>
          <div className="text-lg font-black text-white/90">
            {fmt(order.total)}
          </div>
        </div>

        {/* Timeline */}
        <div className="py-2 opacity-60 grayscale hover:grayscale-0 transition-all">
          <OrderTimeline order={order} />
        </div>

        {/* Ações */}
        <div className="flex gap-2 pt-2">
          {cfg.next && (
            <button
              onClick={() => onAdvance(order.id, cfg.next)}
              className="flex-1 h-12 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}
            >
              {cfg.nextLabel}
            </button>
          )}
          <button
            onClick={() => printService.printKitchenTicket(order)}
            className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:bg-white/10 hover:text-white transition-all"
            title="Imprimir comanda"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Coluna por status
function KitchenColumn({ title, icon: Icon, color, orders, onAdvance }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header da coluna */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        background: 'var(--surface)',
        border: `1px solid ${color}40`,
        borderRadius: 'var(--radius)',
        borderTop: `3px solid ${color}`,
      }}>
        <Icon size={18} color={color} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
        <span style={{
          marginLeft: 'auto',
          background: color,
          color: '#fff',
          borderRadius: '50%',
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
        }}>
          {orders.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.length === 0 ? (
          <div style={{
            padding: '30px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: 13,
          }}>
            Nenhum pedido {title.toLowerCase()}
          </div>
        ) : (
          orders.map(order => (
            <KitchenCard key={order.id} order={order} onAdvance={onAdvance} />
          ))
        )}
      </div>
    </div>
  );
}

export default function Kitchen() {
  const { orders, updateOrderStatus } = useApp();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState(false);

  // Filtra só os pedidos ativos (não entregues/cancelados)
  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status));
  const pendingOrders = activeOrders.filter(o => o.status === 'pending');
  const preparingOrders = activeOrders.filter(o => o.status === 'preparing');
  const readyOrders = activeOrders.filter(o => o.status === 'ready');

  // Auto-refresh a cada 10s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  // Escuta event bus para novos pedidos
  useEffect(() => {
    const unsub = eventBus.on(EVENTS.SALE_CREATED, () => {
      setNewOrderAlert(true);
      setTimeout(() => setNewOrderAlert(false), 3000);
    });
    return unsub;
  }, []);

  const handleAdvance = useCallback((id, newStatus) => {
    updateOrderStatus(id, newStatus);
    const labels = { preparing: 'em preparo', ready: 'pronto', delivered: 'entregue' };
    toast.success(`Pedido marcado como ${labels[newStatus] || newStatus}!`);

    if (newStatus === 'ready') {
      // Toca um alerta sonoro via AudioContext
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch { /* sem som — ok */ }
    }
  }, [updateOrderStatus]);

  return (
    <div className="animate-fade" style={{ minHeight: 'calc(100vh - 100px)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChefHat size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Tela de Produção</h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={10} color="var(--success)" />
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {newOrderAlert && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid var(--success)',
              borderRadius: 20,
              color: 'var(--success)',
              fontSize: 13,
              fontWeight: 700,
              animation: 'pulse 1s ease-in-out 3',
            }}>
              <Bell size={14} />
              Novo pedido!
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-muted)' }}>Auto-refresh</span>
            <button
              onClick={() => setAutoRefresh(p => !p)}
              style={{
                width: 36, height: 20,
                background: autoRefresh ? 'var(--primary)' : 'var(--surface-3)',
                borderRadius: 10, border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 14, height: 14, background: '#fff', borderRadius: '50%',
                position: 'absolute', top: 3,
                left: autoRefresh ? 19 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          <button
            onClick={() => setLastUpdate(new Date())}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Ativos', value: activeOrders.length, icon: Package, color: 'var(--primary-light)' },
          { label: 'Aguardando', value: pendingOrders.length, icon: AlertCircle, color: '#f59e0b' },
          { label: 'Em Preparo', value: preparingOrders.length, icon: Flame, color: '#3b82f6' },
          { label: 'Prontos', value: readyOrders.length, icon: CheckCircle, color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} style={{
            flex: '1 1 120px',
            padding: '12px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <stat.icon size={20} color={stat.color} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Colunas Kanban */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
        alignItems: 'flex-start',
      }}>
        <KitchenColumn
          title="Aguardando"
          icon={AlertCircle}
          color="#f59e0b"
          orders={pendingOrders}
          onAdvance={handleAdvance}
        />
        <KitchenColumn
          title="Em Preparo"
          icon={Flame}
          color="#3b82f6"
          orders={preparingOrders}
          onAdvance={handleAdvance}
        />
        <KitchenColumn
          title="Prontos"
          icon={CheckCircle}
          color="#10b981"
          orders={readyOrders}
          onAdvance={handleAdvance}
        />
      </div>

      {activeOrders.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          color: 'var(--text-muted)',
        }}>
          <ChefHat size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Sem pedidos ativos no momento</div>
          <div style={{ fontSize: 14 }}>Os novos pedidos do PDV aparecerão aqui automaticamente</div>
        </div>
      )}
    </div>
  );
}
