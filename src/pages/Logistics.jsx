import { useState, useMemo } from 'react';
import { 
  Package, Truck, Printer, ScanLine, CheckCircle2, AlertCircle, 
  Search, Box, ClipboardCheck, Barcode, Clock,
  RotateCcw, Info, Layers, MapPin, ChevronRight, Zap,
  TrendingUp, Timer, AlertTriangle, ArrowRight
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 'picking',   label: 'Para Separar', emoji: '📦', color: 'var(--info)' },
  { id: 'packing',   label: 'Conferência',  emoji: '✅', color: 'var(--warning)' },
  { id: 'ready',     label: 'Etiquetagem',  emoji: '🏷️', color: 'var(--success)' },
  { id: 'shipped',   label: 'Enviados',     emoji: '🚚', color: 'var(--text-muted)' },
];

const STATUS_MAP = {
  picking: 'pending',
  packing: 'preparing',
  ready: 'ready',
  shipped: 'delivered',
};

export default function Logistics() {
  const { orders = [], updateOrderStatus } = useApp();
  const [tab, setTab] = useState('picking');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isPacking, setIsPacking] = useState(false);
  const [packedItems, setPackedItems] = useState({});
  const [printPreview, setPrintPreview] = useState(null);

  const logisticsOrders = useMemo(() => {
    const statusKey = STATUS_MAP[tab];
    return orders.filter(o => {
      const matchSearch =
        (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        String(o.number).includes(search);
      return matchSearch && o.status === statusKey;
    });
  }, [orders, tab, search]);

  // KPI counters
  const counts = useMemo(() => {
    const c = {};
    STEPS.forEach(s => { c[s.id] = orders.filter(o => o.status === STATUS_MAP[s.id]).length; });
    return c;
  }, [orders]);

  const handleStartPacking = (order) => {
    setSelectedOrder(order);
    setIsPacking(true);
    setPackedItems({});
    updateOrderStatus(order.id, 'preparing');
    toast.success(`Iniciando conferência do pedido #${order.number}`);
  };

  const togglePacked = (key) => {
    setPackedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinishPacking = () => {
    const allPacked = selectedOrder.items?.every(i => packedItems[i.productId || i.name]);
    if (!allPacked) {
      toast.error('Conclua a conferência de todos os itens primeiro!');
      return;
    }
    updateOrderStatus(selectedOrder.id, 'ready');
    setIsPacking(false);
    setSelectedOrder(null);
    toast.success('Pedido conferido e pronto para etiquetagem! 🏷️');
  };

  const handleShip = (order) => {
    updateOrderStatus(order.id, 'delivered');
    toast.success(`Pedido #${order.number} despachado! 🚀`);
  };

  const packedCount = selectedOrder
    ? (selectedOrder.items?.filter(i => packedItems[i.productId || i.name]).length || 0)
    : 0;
  const totalItems = selectedOrder?.items?.length || 0;
  const packProgress = totalItems > 0 ? (packedCount / totalItems) * 100 : 0;

  return (
    <div className="animate-fade">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={28} style={{ color: 'var(--primary-light)' }} />
            Módulo de Expedição
          </h1>
          <p className="page-subtitle">Gestão de picking, packing e logística de saída</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrap" style={{ width: 240 }}>
            <Search size={14} className="search-icon" />
            <input
              className="input-field"
              placeholder="Buscar pedido ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => toast.success('Exportando relatório de expedição...')}>
            <TrendingUp size={14} /> Relatório
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {STEPS.map(step => (
          <button
            key={step.id}
            onClick={() => setTab(step.id)}
            style={{
              background: tab === step.id
                ? `linear-gradient(135deg, ${step.color}20, ${step.color}08)`
                : 'var(--surface-2)',
              border: `1px solid ${tab === step.id ? step.color : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.25s',
              boxShadow: tab === step.id ? `0 0 20px ${step.color}18` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{step.emoji}</span>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 20,
                background: tab === step.id ? `${step.color}25` : 'var(--surface-3)',
                color: tab === step.id ? step.color : 'var(--text-muted)',
              }}>
                {counts[step.id]}
              </span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: tab === step.id ? step.color : 'var(--text)' }}>
              {counts[step.id]}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
              {step.label}
            </div>
            {tab === step.id && (
              <div style={{ marginTop: 10, height: 2, background: step.color, borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'flex-start' }}>

        {/* Orders List */}
        <div>
          {logisticsOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '80px 0' }}>
              <Package size={48} style={{ opacity: 0.15, marginBottom: 14 }} />
              <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Nenhum pedido pendente nesta etapa.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                Quando chegarem pedidos, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {logisticsOrders.map(order => (
                <div
                  key={order.id}
                  className="glass-card"
                  style={{ padding: 0, overflow: 'hidden', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Card Header */}
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>
                        #{String(order.number || 0).padStart(4, '0')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {order.customerName || 'Cliente'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-light)' }}>
                        R$ {(order.total || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                        {order.type || 'E-commerce'}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
                      {order.items?.slice(0, 3).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{item.quantity}×</span> {item.name}
                          </span>
                          <span style={{
                            fontSize: 9, background: 'var(--surface-3)', color: 'var(--text-muted)',
                            padding: '2px 6px', borderRadius: 6, fontWeight: 700
                          }}>
                            SKU-{(item.productId || '0000').slice(-4).toUpperCase()}
                          </span>
                        </div>
                      ))}
                      {(order.items?.length || 0) > 3 && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>
                          + {order.items.length - 3} outros itens
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {tab === 'picking' && (
                        <button className="btn btn-primary btn-sm w-full" onClick={() => handleStartPacking(order)}>
                          <ClipboardCheck size={14} /> Iniciar Conferência
                        </button>
                      )}
                      {tab === 'packing' && (
                        <button className="btn btn-sm w-full" style={{ background: 'var(--warning)', color: '#000', fontWeight: 700 }}
                          onClick={() => { setSelectedOrder(order); setIsPacking(true); setPackedItems({}); }}>
                          <ScanLine size={14} /> Continuar Packing
                        </button>
                      )}
                      {tab === 'ready' && (
                        <>
                          <button className="btn btn-secondary btn-sm flex-1"
                            onClick={() => { setPrintPreview(order); toast.success('Etiqueta gerada!'); }}>
                            <Printer size={14} /> Etiqueta
                          </button>
                          <button className="btn btn-sm flex-1"
                            style={{ background: 'var(--success)', color: '#fff', fontWeight: 700 }}
                            onClick={() => handleShip(order)}>
                            <Truck size={14} /> Despachar
                          </button>
                        </>
                      )}
                      {tab === 'shipped' && (
                        <button className="btn btn-ghost btn-sm w-full"
                          onClick={() => toast.success(`Rastreio: BR${Math.random().toString().slice(2,11)}BR`)}>
                          <MapPin size={14} /> Ver Rastreio
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Packing Interface */}
          {isPacking && selectedOrder ? (
            <div className="glass-card" style={{
              border: '1px solid var(--warning)',
              boxShadow: '0 0 30px rgba(245,158,11,0.15)',
              position: 'sticky', top: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ScanLine size={18} color="var(--warning)" /> Packing #{selectedOrder.number}
                </h3>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsPacking(false)}>
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6, color: 'var(--text-muted)', fontWeight: 700 }}>
                  <span>Progresso da conferência</span>
                  <span style={{ color: packProgress === 100 ? 'var(--success)' : 'var(--warning)' }}>
                    {packedCount}/{totalItems}
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${packProgress}%`,
                    background: packProgress === 100 ? 'var(--success)' : 'var(--warning)',
                    borderRadius: 3,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              </div>

              {/* Items Checklist */}
              <div style={{ background: 'var(--surface-3)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: 1 }}>
                  ITENS DO PEDIDO
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedOrder.items?.map((item, idx) => {
                    const key = item.productId || item.name;
                    const done = !!packedItems[key];
                    return (
                      <div
                        key={idx}
                        onClick={() => togglePacked(key)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          cursor: 'pointer', opacity: done ? 0.65 : 1,
                          transition: 'all 0.2s', userSelect: 'none',
                          padding: '6px 8px', borderRadius: 8,
                          background: done ? 'rgba(16,185,129,0.08)' : 'transparent'
                        }}
                      >
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          border: `2px solid ${done ? 'var(--success)' : 'var(--border)'}`,
                          background: done ? 'var(--success)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.2s'
                        }}>
                          {done && <CheckCircle2 size={13} color="#fff" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            textDecoration: done ? 'line-through' : 'none',
                            color: done ? 'var(--text-muted)' : 'var(--text)'
                          }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {item.quantity} unidade{item.quantity > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 12 }}>
                <Info size={12} /> Toque em cada item para confirmar.
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={handleFinishPacking}
                style={{ opacity: packProgress < 100 ? 0.6 : 1 }}
              >
                <CheckCircle2 size={16} /> Concluir Embalagem
              </button>
            </div>
          ) : (
            <>
              {/* Visão Geral */}
              <div className="glass-card">
                <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="var(--primary-light)" /> Visão Geral
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Tempo Médio Picking', value: '14 min', icon: Timer, color: 'var(--info)' },
                    { label: 'Eficiência Packing', value: '98.2%', icon: CheckCircle2, color: 'var(--success)' },
                    { label: 'Pedidos Atrasados', value: '0', icon: AlertCircle, color: 'var(--warning)' },
                    { label: 'SLA Cumprido Hoje', value: '100%', icon: Zap, color: 'var(--primary-light)' },
                  ].map((stat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${stat.color}15`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <stat.icon size={16} color={stat.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{stat.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="glass-card">
                <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>Ações Rápidas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: Layers, label: 'Picking em Lote', desc: 'Separar múltiplos pedidos' },
                    { icon: Printer, label: 'Todas as Etiquetas', desc: 'Imprimir fila completa' },
                    { icon: Truck, label: 'Manifesto de Envio', desc: 'Gerar manifesto da transportadora' },
                  ].map((action, i) => (
                    <button
                      key={i}
                      onClick={() => toast.success(`${action.label} em desenvolvimento!`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                        transition: 'all 0.2s', textAlign: 'left',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.background = 'var(--surface-3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <action.icon size={15} color="var(--primary-light)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{action.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{action.desc}</div>
                      </div>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Label Preview */}
              {tab === 'ready' && logisticsOrders.length > 0 && (
                <div className="glass-card">
                  <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 14 }}>
                    Preview de Etiqueta
                  </h3>
                  <div style={{
                    padding: 16, background: '#fff', color: '#000',
                    borderRadius: 8, border: '2px solid #000',
                    fontSize: 11, fontFamily: 'monospace'
                  }}>
                    <div style={{ borderBottom: '2px solid #000', paddingBottom: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: 14 }}>🍇 Açaí ERP SaaS</div>
                      <Barcode size={24} />
                    </div>
                    <div style={{ fontWeight: 800, marginBottom: 2 }}>DESTINATÁRIO:</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{logisticsOrders[0].customerName}</div>
                    <div style={{ marginTop: 4, fontSize: 10 }}>Rua das Flores, 123 — Centro</div>
                    <div style={{ fontSize: 10 }}>São Paulo — SP | CEP: 01001-000</div>
                    <div style={{
                      marginTop: 10, borderTop: '1px dashed #000', paddingTop: 8,
                      display: 'flex', justifyContent: 'space-between', fontSize: 10
                    }}>
                      <span>#{logisticsOrders[0].number}</span>
                      <span>Peso: 1.2kg</span>
                    </div>
                    <div style={{ marginTop: 8, background: '#000', color: '#fff', textAlign: 'center', padding: '4px', fontWeight: 800, borderRadius: 4 }}>
                      MERCADO ENVIOS
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
