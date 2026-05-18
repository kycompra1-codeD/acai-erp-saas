import { useState, useMemo } from 'react';
import {
  Plus, AlertTriangle, CheckCircle, TrendingDown, Search, X, ArrowUp, ArrowDown,
  Edit2, BarChart2, ClipboardList, RefreshCw, Package
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

function getStockStatus(item) {
  if (item.quantity === 0) return { label: 'Sem estoque', color: 'danger', icon: 'danger' };
  if (item.quantity <= item.minQuantity) return { label: 'Baixo', color: 'warning', icon: 'warning' };
  return { label: 'OK', color: 'success', icon: 'success' };
}

const EMPTY_ITEM = { name: '', unit: 'kg', quantity: '', minQuantity: '', cost: '', supplier: '' };
const LOSS_REASONS = ['Perda/Avaria', 'Vencimento', 'Consumo Interno', 'Ajuste de Inventário', 'Outro'];

export default function Inventory() {
  const { inventory, updateInventoryItem, addInventoryItem, addInventoryStock } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null); // null | 'add' | item
  const [form, setForm] = useState(EMPTY_ITEM);

  // Adjustment modal
  const [adjModal, setAdjModal] = useState(null); // item
  const [adjMode, setAdjMode] = useState('entrada'); // 'entrada' | 'saida' | 'acerto'
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState(LOSS_REASONS[0]);
  const [adjNote, setAdjNote] = useState('');

  // Movements modal
  const [movModal, setMovModal] = useState(null);

  const filtered = useMemo(() => inventory.filter(i => {
    const status = getStockStatus(i);
    const matchFilter = filter === 'all' || status.icon === filter;
    const matchSearch = search === '' || (i.name || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [inventory, search, filter]);

  const stats = useMemo(() => ({
    total: inventory.length,
    danger: inventory.filter(i => i.quantity === 0).length,
    warning: inventory.filter(i => i.quantity > 0 && i.quantity <= i.minQuantity).length,
    ok: inventory.filter(i => i.quantity > i.minQuantity).length,
  }), [inventory]);

  const handleSave = async () => {
    if (!form.name) { toast.error('Nome obrigatório'); return; }
    try {
      if (modal === 'add') {
        await addInventoryItem({ ...form, quantity: parseFloat(form.quantity || 0), minQuantity: parseFloat(form.minQuantity || 0), cost: parseFloat(form.cost || 0) });
        toast.success('Insumo adicionado!');
      } else {
        await updateInventoryItem(modal.id, { ...form, quantity: parseFloat(form.quantity || 0), minQuantity: parseFloat(form.minQuantity || 0), cost: parseFloat(form.cost || 0) });
        toast.success('Insumo atualizado!');
      }
      setModal(null); setForm(EMPTY_ITEM);
    } catch { toast.error('Erro ao salvar. Tente novamente.'); }
  };

  const handleAdjust = async () => {
    const qty = parseFloat(adjQty);
    if (!adjQty || isNaN(qty) || qty <= 0) { toast.error('Informe uma quantidade válida'); return; }
    if (adjMode === 'saida' && qty > adjModal.quantity) { toast.error('Quantidade maior que o saldo atual'); return; }
    if (adjMode === 'acerto' && qty < 0) { toast.error('Valor de acerto inválido'); return; }

    let newQty;
    if (adjMode === 'entrada') newQty = adjModal.quantity + qty;
    else if (adjMode === 'saida') newQty = adjModal.quantity - qty;
    else newQty = qty;

    try {
      await updateInventoryItem(adjModal.id, { quantity: newQty, lastUpdate: new Date().toISOString() });
      const modeLabel = { entrada: '✅ Entrada', saida: '📉 Saída/Perda', acerto: '✏️ Acerto' }[adjMode];
      toast.success(`${modeLabel}: ${adjModal.name} — Novo saldo: ${newQty} ${adjModal.unit}`);
      setAdjModal(null); setAdjQty(''); setAdjReason(LOSS_REASONS[0]); setAdjNote('');
    } catch { toast.error('Erro ao ajustar estoque. Tente novamente.'); }
  };

  const openAdj = (item) => { setAdjModal(item); setAdjMode('entrada'); setAdjQty(''); setAdjReason(LOSS_REASONS[0]); setAdjNote(''); };

  const previewQty = () => {
    const q = parseFloat(adjQty);
    if (isNaN(q) || q <= 0) return null;
    if (adjMode === 'entrada') return adjModal.quantity + q;
    if (adjMode === 'saida') return adjModal.quantity - q;
    return q;
  };

  const movTypeLabel = { entrada: '➕ Entrada', saida: '➖ Saída', acerto: '✏️ Acerto' };
  const movTypeColor = { entrada: '#10b981', saida: '#ef4444', acerto: '#f59e0b' };

  return (
    <div className="animate-fade">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} style={{ color: 'var(--primary-light)' }} />
            Controle de Estoque
          </h1>
          <p className="page-subtitle">Gerencie seus insumos e acompanhe os níveis de estoque</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total de Insumos', value: stats.total, color: 'var(--primary-light)', bg: 'var(--primary-glow)' },
          { label: 'Sem Estoque', value: stats.danger, color: 'var(--danger)', bg: 'var(--danger-bg)' },
          { label: 'Estoque Baixo', value: stats.warning, color: 'var(--warning)', bg: 'var(--warning-bg)' },
          { label: 'Estoque OK', value: stats.ok, color: 'var(--success)', bg: 'var(--success-bg)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ key: 'all', label: 'Todos' }, { key: 'danger', label: '🔴 Crítico' }, { key: 'warning', label: '🟡 Baixo' }, { key: 'success', label: '🟢 OK' }].map(f => (
            <button key={f.key} className={`btn btn-sm ${filter === f.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input className="input-field" placeholder="Buscar insumo..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_ITEM); setModal('add'); }}><Plus size={16} /> Novo Insumo</button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Fornecedor</th>
              <th>Quantidade</th>
              <th>Mínimo</th>
              <th>Custo/un</th>
              <th>Status</th>
              <th>Atualizado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const status = getStockStatus(item);
              const pct = Math.min(100, (item.quantity / Math.max(item.minQuantity * 2, 1)) * 100);
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    {item.movements?.length > 0 && (
                      <button onClick={() => setMovModal(item)} style={{ fontSize: 10, color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                        <ClipboardList size={10} style={{ display: 'inline', marginRight: 2 }} />
                        {item.movements.length} movimentações
                      </button>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.supplier || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: status.color === 'danger' ? 'var(--danger)' : status.color === 'warning' ? 'var(--warning)' : 'var(--success)' }} />
                      </div>
                      <span style={{ fontWeight: 700 }}>{item.quantity} {item.unit}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.minQuantity} {item.unit}</td>
                  <td style={{ fontSize: 12 }}>{item.cost > 0 ? `R$ ${item.cost.toFixed(2)}` : '—'}</td>
                  <td><span className={`badge badge-${status.color}`}>{status.label}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {(() => { try { return format(new Date(item.lastUpdate), 'dd/MM HH:mm', { locale: ptBR }); } catch { return '—'; } })()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => openAdj(item)} title="Ajustar estoque">
                        <BarChart2 size={13} /> Ajustar
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setForm({ ...EMPTY_ITEM, ...item }); setModal(item); }} title="Editar insumo">
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 0' }}><CheckCircle size={36} style={{ opacity: 0.2 }} /><p>Nenhum item encontrado</p></div>
        )}
      </div>

      {/* Adjustment Modal */}
      {adjModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 440, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="text-base font-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={18} color="var(--primary-light)" /> Ajuste de Estoque
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAdjModal(null)}><X size={18} /></button>
            </div>

            {/* Info */}
            <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700 }}>{adjModal.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saldo atual: <strong style={{ color: 'var(--text)' }}>{adjModal.quantity} {adjModal.unit}</strong></div>
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {[
                { key: 'entrada', label: '➕ Entrada', desc: 'Compra/reposição' },
                { key: 'saida', label: '➖ Saída', desc: 'Perda/consumo' },
                { key: 'acerto', label: '✏️ Acerto', desc: 'Saldo absoluto' },
              ].map(m => (
                <button key={m.key} onClick={() => setAdjMode(m.key)} style={{ flex: 1, padding: '10px 8px', background: adjMode === m.key ? 'var(--primary)' : 'var(--surface-2)', color: adjMode === m.key ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Qty */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{adjMode === 'acerto' ? 'Novo saldo' : 'Quantidade'} ({adjModal.unit})</label>
              <input className="input-field" type="number" step="0.01" value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0" autoFocus />
            </div>

            {/* Reason (only for saida) */}
            {adjMode === 'saida' && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Motivo *</label>
                <select className="input-field" value={adjReason} onChange={e => setAdjReason(e.target.value)}>
                  {LOSS_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            {/* Note */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Observação</label>
              <input className="input-field" value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="Opcional..." />
            </div>

            {/* Preview */}
            {adjQty && !isNaN(parseFloat(adjQty)) && previewQty() !== null && (
              <div style={{ fontSize: 13, padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 14, background: adjMode === 'saida' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: adjMode === 'saida' ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                {adjMode === 'saida' ? '📉' : adjMode === 'entrada' ? '📈' : '✏️'} Novo saldo: {previewQty()?.toFixed(2)} {adjModal.unit}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary w-full" onClick={() => setAdjModal(null)}>Cancelar</button>
              <button className={`btn w-full ${adjMode === 'saida' ? 'btn-danger' : 'btn-primary'}`} onClick={handleAdjust}>
                {adjMode === 'entrada' ? <ArrowUp size={16} /> : adjMode === 'saida' ? <ArrowDown size={16} /> : <RefreshCw size={16} />}
                {adjMode === 'entrada' ? 'Adicionar' : adjMode === 'saida' ? 'Registrar Saída' : 'Aplicar Acerto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movements Modal */}
      {movModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 24, border: '1px solid var(--border)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="text-base font-bold"><ClipboardList size={18} style={{ display: 'inline', marginRight: 8 }} /> Movimentações — {movModal.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setMovModal(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(movModal.movements || []).length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Sem movimentações registradas</p>
              ) : (movModal.movements || []).map(m => (
                <div key={m.id} style={{ padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: movTypeColor[m.type] }}>{movTypeLabel[m.type]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.reason}{m.note ? ` — ${m.note}` : ''}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {(() => { try { return format(new Date(m.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return '—'; } })()}
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: m.qty >= 0 ? '#10b981' : '#ef4444', fontSize: 14 }}>
                    {m.qty >= 0 ? '+' : ''}{m.qty} {movModal.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 480, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 className="modal-title">{modal === 'add' ? 'Novo Insumo' : 'Editar Insumo'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Polpa de Açaí" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <select className="input-field" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {['kg', 'litro', 'unid', 'caixa', 'saco', 'pacote', 'g', 'ml'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Custo/unidade</label>
                  <input className="input-field" type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="0,00" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantidade atual</label>
                  <input className="input-field" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mínimo (alerta)</label>
                  <input className="input-field" type="number" value={form.minQuantity} onChange={e => setForm({ ...form, minQuantity: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fornecedor</label>
                <input className="input-field" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Nome do fornecedor" />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-secondary w-full" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-primary w-full" onClick={handleSave}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
