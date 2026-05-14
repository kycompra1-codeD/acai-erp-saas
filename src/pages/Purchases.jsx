import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Package, Truck, FileText, Plus,
  AlertTriangle, CheckCircle2, ChevronRight,
  TrendingDown, UploadCloud, Loader2, RefreshCw
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { comprasApi } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_LABEL = {
  pendente: { label: 'Pendente', cls: 'badge-warning' },
  aprovada: { label: 'Aprovada', cls: 'badge-info' },
  recebida: { label: 'Recebida', cls: 'badge-success' },
  cancelada: { label: 'Cancelada', cls: 'badge-danger' },
};

function fmt(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function Purchases() {
  const { inventory = [], suppliers = [], getDashboardStats } = useApp();
  const [tab, setTab] = useState('necessidade');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Sugestões de reposição derivadas do estoque real
  const suggestions = useMemo(() =>
    inventory
      .filter(i => i.quantity <= i.minQuantity)
      .map(i => {
        const sup = suppliers.find(s => s.id === i.supplierId);
        return {
          id: i.id,
          name: i.name,
          current: i.quantity,
          minQuantity: i.minQuantity,
          unit: i.unit,
          cost: i.cost,
          supplier: sup?.name || 'Não definido',
          supplierId: i.supplierId,
        };
      }),
  [inventory, suppliers]);

  // Custo estimado de reposição
  const estimatedCost = useMemo(() =>
    suggestions.reduce((acc, s) => acc + ((s.minQuantity - s.current) * (s.cost || 0)), 0),
  [suggestions]);

  // Top produto mais vendido
  const topProduct = useMemo(() => {
    const stats = getDashboardStats?.();
    return stats?.topProducts?.[0]?.name || '—';
  }, [getDashboardStats]);

  const loadOrders = useCallback(async () => {
    const token = localStorage.getItem('acai_access_token');
    if (!token) return;
    setLoadingOrders(true);
    try {
      const res = await comprasApi.listar({ limit: 50 });
      if (res?.dados) {
        setOrders(res.dados.map(c => ({
          id: c.id,
          numero: c.numero || c.id.slice(-6).toUpperCase(),
          supplier: c.fornecedor_nome || 'Fornecedor',
          date: c.criado_em?.split('T')[0] || '',
          total: parseFloat(c.total ?? 0),
          status: c.status || 'pendente',
          items: c.itens?.length ?? 0,
        })));
      }
    } catch {
      // Sem compras cadastradas ainda
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleUpdateStatus = async (id, novoStatus) => {
    try {
      await comprasApi.atualizarStatus(id, novoStatus);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: novoStatus } : o));
      toast.success(`Ordem atualizada para "${STATUS_LABEL[novoStatus]?.label}"`);
    } catch (err) {
      toast.error(err.message || 'Erro ao atualizar status');
    }
  };

  const handleGeneratePO = async () => {
    if (!selectedSupplier) {
      toast.error('Selecione um fornecedor para gerar a Ordem de Compra');
      return;
    }
    const itensDoFornecedor = suggestions.filter(s => s.supplierId === selectedSupplier);
    if (itensDoFornecedor.length === 0) {
      toast.error('Nenhum item com estoque baixo vinculado a este fornecedor');
      return;
    }
    try {
      const res = await comprasApi.criar({
        fornecedor_id: selectedSupplier,
        itens: itensDoFornecedor.map(s => ({
          insumo_id: s.id,
          nome_item: s.name,
          quantidade: s.minQuantity - s.current,
          unidade: s.unit,
          preco_unitario: s.cost || 0,
        })),
        total: itensDoFornecedor.reduce((a, s) => a + ((s.minQuantity - s.current) * (s.cost || 0)), 0),
      });
      if (res?.dados) {
        toast.success('Ordem de Compra criada com sucesso!');
        loadOrders();
        setTab('ordens');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao criar ordem de compra');
    }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Suprimentos e Compras</h1>
          <p className="page-subtitle">Gestão de estoque mínimo, fornecedores e ordens de compra</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={loadOrders}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <button className="btn btn-primary" onClick={() => toast('Importação de XML em breve', { icon: '🚧' })}>
            <UploadCloud size={16} /> Importar NF-e (XML)
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'necessidade', label: `⚠️ Necessidade de Compra (${suggestions.length})`, icon: AlertTriangle },
          { id: 'ordens', label: `📝 Ordens de Compra (${orders.length})`, icon: FileText },
          { id: 'fornecedores', label: '🤝 Fornecedores', icon: Truck },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '12px 20px', background: 'none', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === t.id ? 'var(--primary-light)' : 'var(--text-muted)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
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
              {suggestions.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
                  <CheckCircle2 size={40} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Estoque em dia!</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum item abaixo do estoque mínimo.</div>
                </div>
              ) : suggestions.map(item => (
                <div key={item.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AlertTriangle size={20} color="var(--danger)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Estoque: <strong style={{ color: 'var(--danger)' }}>{item.current} {item.unit}</strong> / Mínimo: {item.minQuantity} {item.unit} • {item.supplier}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'right', fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{fmt((item.minQuantity - item.current) * (item.cost || 0))}</div>
                      <div style={{ color: 'var(--text-muted)' }}>estimado</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setSelectedSupplier(item.supplierId || '');
                      setTab('necessidade');
                      toast('Selecione o fornecedor ao lado e clique em Gerar O.C.', { icon: '👉' });
                    }}>
                      <Plus size={14} /> Gerar O.C.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'ordens' && (
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: 40 }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                  <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 13 }}>Carregando ordens...</div>
                </div>
              ) : orders.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
                  <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Nenhuma ordem de compra</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gere ordens a partir da aba Necessidade de Compra.</div>
                </div>
              ) : orders.map(o => {
                const st = STATUS_LABEL[o.status] || { label: o.status, cls: '' };
                return (
                  <div key={o.id} className="glass-card flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={20} color="var(--primary-light)" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>OC-{o.numero}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {o.supplier} · {o.date} · {o.items} iten{o.items !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800 }}>{fmt(o.total)}</div>
                        <span className={`badge ${st.cls}`}>{st.label}</span>
                      </div>
                      {o.status === 'pendente' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleUpdateStatus(o.id, 'aprovada')}>Aprovar</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleUpdateStatus(o.id, 'cancelada')}>Cancelar</button>
                        </div>
                      )}
                      {o.status === 'aprovada' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(o.id, 'recebida')}>
                          <CheckCircle2 size={14} /> Confirmar Recebimento
                        </button>
                      )}
                      {(o.status === 'recebida' || o.status === 'cancelada') && (
                        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'fornecedores' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.length === 0 ? (
                <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48 }}>
                  <Truck size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontWeight: 700 }}>Nenhum fornecedor cadastrado</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Cadastre fornecedores na página de Fornecedores.</div>
                </div>
              ) : suppliers.map(s => (
                <div key={s.id} className="glass-card">
                  <div className="flex justify-between items-start mb-4">
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                    <div className={`badge ${s.status === 'ativo' ? 'badge-success' : 'badge-muted'}`}>{s.status || 'ativo'}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {s.phone && <div>📞 {s.phone}</div>}
                    {s.email && <div>📧 {s.email}</div>}
                    {s.category && <div>🏷️ {s.category}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {inventory.filter(i => i.supplierId === s.id).length} iten(s) vinculado(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          <div className="glass-card" style={{ border: '1px solid var(--primary-light)', background: 'var(--primary-glow)' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={18} /> Gerar Ordem de Compra
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 16 }}>
              {suggestions.length > 0
                ? <><strong>{suggestions.length}</strong> iten(s) com estoque crítico.</>
                : 'Todos os itens estão dentro do estoque mínimo.'}
            </p>
            <div className="form-group mb-4">
              <label className="form-label">Selecionar Fornecedor</label>
              <select className="input-field" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                <option value="">Selecione...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary w-full" onClick={handleGeneratePO} disabled={!selectedSupplier || suggestions.length === 0}>
              <Plus size={16} /> Gerar Ordem de Compra
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
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{fmt(estimatedCost)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} color="var(--info)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Produto mais Vendido</div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{topProduct}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
