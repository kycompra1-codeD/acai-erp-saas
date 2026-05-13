import { useState, useMemo } from 'react';
import { 
  ShoppingCart, Package, Truck, FileText, Plus, Search, 
  AlertTriangle, CheckCircle2, ChevronRight, ArrowRight,
  TrendingDown, TrendingUp, History, UploadCloud, Download,
  ExternalLink, Trash2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export default function Purchases() {
  const { products = [], suppliers = [] } = useApp();
  const [tab, setTab] = useState('necessidade');
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');

  // Mock data for restock suggestions
  const suggestions = useMemo(() => [
    { id: 1, name: 'Polpa de Açaí 10kg', type: 'inventory', current: 5, minQuantity: 15, supplier: 'Açaí Tropical' },
    { id: 2, name: 'Granola Premium 5kg', type: 'inventory', current: 2, minQuantity: 8, supplier: 'Natural Foods' },
    { id: 3, name: 'Copo 300ml (Cx 500)', type: 'inventory', current: 1, minQuantity: 5, supplier: 'Embala Mix' },
    { id: 4, name: 'Açaí Pote 1L', type: 'product', current: 8, minQuantity: 20, supplier: 'Produção Própria' },
  ], []);

  const [orders, setOrders] = useState([
    { id: 'OC-1001', supplier: 'Açaí Tropical', date: '2024-04-26', total: 1250.00, status: 'approved', items: 12 },
    { id: 'OC-1002', supplier: 'Embala Mix', date: '2024-04-27', total: 450.00, status: 'pending', items: 5 },
    { id: 'OC-1003', supplier: 'Natural Foods', date: '2024-04-28', total: 890.00, status: 'received', items: 8 },
  ]);

  const handleGeneratePO = () => {
    if (!selectedSupplier) {
      toast.error('Selecione um fornecedor para gerar a Ordem de Compra');
      return;
    }
    toast.success('Ordem de Compra gerada com sucesso! Enviando por e-mail...');
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suprimentos e Compras</h1>
          <p className="page-subtitle">Gestão de estoque mínimo, fornecedores e ordens de compra</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => toast('Histórico em breve', { icon: '🚧' })}>
            <History size={16} /> Histórico de Compras
          </button>
          <button className="btn btn-primary" onClick={() => toast.success('Importação de XML iniciada...')}>
            <UploadCloud size={16} /> Importar NF-e (XML)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'necessidade', label: '⚠️ Necessidade de Compra', icon: AlertTriangle },
          { id: 'ordens',      label: '📝 Ordens de Compra',      icon: FileText },
          { id: 'fornecedores',label: '🤝 Fornecedores',          icon: Truck },
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)} 
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === t.id ? 'var(--primary-light)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center', gap: 8
            }}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Main Area */}
        <div className="lg:col-span-2 space-y-4">
          
          {tab === 'necessidade' && (
            <div className="space-y-4">
              {suggestions.map(item => (
                <div key={item.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={20} color="var(--danger)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Estoque: <strong style={{ color: 'var(--danger)' }}>{item.current}</strong> / Mínimo: {item.minQuantity} • {item.supplier}
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => toast('Preenchendo nova ordem de compra...')}>
                    <Plus size={14} /> Gerar O.C.
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'ordens' && (
            <div className="space-y-4">
              {orders.map(o => (
                <div key={o.id} className="glass-card flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color="var(--primary-light)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{o.id}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fornecedor: {o.supplier} • Gerada em {o.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800 }}>R$ {o.total.toFixed(2)}</div>
                      <div className={`badge ${o.status === 'approved' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : ''}`}>{o.status}</div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={() => toast('Detalhes da ordem em breve')}><ChevronRight size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'fornecedores' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map(s => (
                <div key={s.id} className="glass-card">
                  <div className="flex justify-between items-start mb-4">
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                    <div className="badge badge-success">Ativo</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    <div>📍 {s.address || 'Endereço não cadastrado'}</div>
                    <div>📞 {s.phone || 'Sem telefone'}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm w-full" onClick={() => toast('Produtos vinculados (em breve)')}>Ver Produtos Vinculados</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar Analysis */}
        <div className="space-y-6">
          <div className="glass-card" style={{ border: '1px solid var(--primary-light)', background: 'var(--primary-glow)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} /> Resumo de Compra
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
              Existem <strong>{suggestions.length}</strong> itens com estoque crítico ou necessidade de reposição.
            </p>
            
            <div className="form-group mb-4">
              <label className="form-label">Selecionar Fornecedor</label>
              <select className="input-field" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                <option value="">Selecione...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <button className="btn btn-primary w-full" onClick={handleGeneratePO}>
              Gerar Ordem de Compra
            </button>
          </div>

          <div className="glass-card">
            <h3 style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>Insights de Suprimentos</h3>
            <div className="space-y-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDown size={18} color="var(--danger)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gasto Estimado (Reposição)</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>R$ 4.850,00</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} color="var(--info)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Produtos mais Vendidos</div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>Açaí Tradicional 5L</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
