// ============================================================
// CRM — Zullya ERP
// ============================================================
import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  X, Plus, Trash2, CheckCircle2, FileDown, 
  User, Briefcase, Calendar, Info, Search, Download, UserPlus,
  Users, Star, TrendingUp, AlertCircle, Crown, Phone, Mail,
  ChevronRight, ShoppingBag, Zap, FileText
} from 'lucide-react';
import { subDays, differenceInDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import { crmApi } from '../services/api';

const CUSTOMERS = [
  { id: 'c1', name: 'Ana Beatriz',   phone: '(11) 99999-1111', email: 'ana@email.com',    totalSpent: 1240.80, ordersCount: 42, lastPurchase: subDays(new Date(), 3).toISOString(),  tags: ['VIP', 'Fiel'] },
  { id: 'c2', name: 'Carlos Eduardo',phone: '(11) 99999-2222', email: 'carlos@email.com', totalSpent: 580.50,  ordersCount: 18, lastPurchase: subDays(new Date(), 8).toISOString(),  tags: ['Frequente'] },
  { id: 'c3', name: 'Fernanda Lima', phone: '(11) 99999-3333', email: 'fe@email.com',     totalSpent: 2100.20, ordersCount: 75, lastPurchase: subDays(new Date(), 1).toISOString(),  tags: ['VIP', 'Top 10'] },
  { id: 'c4', name: 'Gabriel Santos',phone: '(11) 99999-4444', email: null,               totalSpent: 95.00,   ordersCount: 4,  lastPurchase: subDays(new Date(), 45).toISOString(), tags: ['Em Risco'] },
  { id: 'c5', name: 'Helena Martins',phone: '(11) 99999-5555', email: 'helena@email.com', totalSpent: 3200.00, ordersCount: 110,lastPurchase: subDays(new Date(), 0).toISOString(),  tags: ['VIP', 'Fiel', 'Top 10'] },
  { id: 'c6', name: 'Igor Alves',    phone: '(11) 99999-6666', email: null,               totalSpent: 210.00,  ordersCount: 9,  lastPurchase: subDays(new Date(), 60).toISOString(), tags: ['Inativo'] },
  { id: 'c7', name: 'Juliana Costa', phone: '(11) 99999-7777', email: 'ju@email.com',     totalSpent: 780.00,  ordersCount: 28, lastPurchase: subDays(new Date(), 5).toISOString(),  tags: ['Frequente'] },
  { id: 'c8', name: 'Lucas Pereira', phone: '(11) 99999-8888', email: 'lucas@email.com',  totalSpent: 45.00,   ordersCount: 2,  lastPurchase: subDays(new Date(), 7).toISOString(),  tags: ['Novo'] },
  { id: 'c9', name: 'Marina Souza',  phone: '(11) 99998-0001', email: 'marina@email.com', totalSpent: 1560.00, ordersCount: 55, lastPurchase: subDays(new Date(), 2).toISOString(),  tags: ['VIP'] },
  { id: 'c10',name: 'Rafael Torres', phone: '(11) 99998-0002', email: null,               totalSpent: 320.00,  ordersCount: 12, lastPurchase: subDays(new Date(), 90).toISOString(), tags: ['Inativo'] },
];

const ETAPAS = [
  { id: 'lead',         label: 'Lead',       color: '#6B7280' },
  { id: 'contato',      label: 'Contato',    color: 'var(--info)' },
  { id: 'proposta',     label: 'Proposta',   color: 'var(--warning)' },
  { id: 'negociacao',   label: 'Negociação', color: 'var(--accent)' },
  { id: 'fechado_ganho',label: 'Fechado',    color: 'var(--success)' },
];

const TAG_STYLES = {
  'VIP':       { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  'Top 10':    { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)' },
  'Fiel':      { bg: 'var(--primary-glow)',   color: 'var(--primary-light)' },
  'Frequente': { bg: 'var(--info-bg)',         color: 'var(--info)' },
  'Novo':      { bg: 'var(--success-bg)',      color: 'var(--success)' },
  'Em Risco':  { bg: 'var(--warning-bg)',      color: 'var(--warning)' },
  'Inativo':   { bg: 'var(--danger-bg)',       color: 'var(--danger)' },
};

function getScore(c) {
  const lastDate = c.lastPurchase || c.createdAt || new Date().toISOString();
  const days = differenceInDays(new Date(), new Date(lastDate));
  return Math.round(Math.max(0, 100 - days * 2) * 0.3 + Math.min(100, (c.ordersCount || 0) * 1.2) * 0.4 + Math.min(100, (c.totalSpent || 0) / 30) * 0.3);
}

export default function CRM() {
  const { 
    customers = [], proposals = [], addProposal, updateProposalStatus, 
    convertProposalToOrder, products = [], settings
  } = useApp();
  const [oportunidades, setOportunidades] = useState([]);
  const [novaOp, setNovaOp] = useState({ titulo: '', valor: '', etapa: 'lead', probabilidade: 50, notas: '' });
  const [showOpModal, setShowOpModal] = useState(false);
  const [selectedOp, setSelectedOp] = useState(null);
  const [showEditOpModal, setShowEditOpModal] = useState(false);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [tab, setTab] = useState('clientes');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleMoveOpportunity = async (id, newEtapa) => {
    // Optimistic update
    setOportunidades(prev => prev.map(o => o.id === id ? { ...o, etapa: newEtapa } : o));
    try {
      await crmApi.editar(id, { etapa: newEtapa });
    } catch {
      toast.error('Erro ao atualizar etapa da oportunidade.');
      // Revert/refresh state on error
      crmApi.listar().then(res => {
        if (res?.dados) setOportunidades(res.dados);
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    crmApi.listar().then(res => {
      if (mounted && res?.dados) setOportunidades(res.dados);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Form State for New Proposal
  const [newProp, setNewProp] = useState({
    customerId: '',
    items: [],
    notes: '',
    expiryDate: format(subDays(new Date(), -7), 'yyyy-MM-dd')
  });

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const match = c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || (c.email || '').toLowerCase().includes(q);
    if (!match) return false;
    const tags = c.tags || [];
    if (segment === 'vip')      return tags.includes('VIP');
    if (segment === 'frequent') return tags.includes('Frequente');
    if (segment === 'new')      return tags.includes('Novo');
    if (segment === 'at_risk')  return tags.includes('Em Risco');
    if (segment === 'inactive') return tags.includes('Inativo');
    return true;
  });

  const totalRevenue = customers.reduce((s, c) => s + (c.totalSpent || 0), 0);
  const totalOrders  = customers.reduce((s, c) => s + (c.ordersCount || 0), 0);

  const handleAddProposal = () => {
    if (!newProp.customerId || newProp.items.length === 0) {
      toast.error('Selecione um cliente e ao menos um item');
      return;
    }
    const customer = customers.find(c => c.id === newProp.customerId);
    const total = newProp.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    
    addProposal({
      ...newProp,
      customerName: customer.name,
      total
    });
    
    setIsModalOpen(false);
    setNewProp({ customerId: '', items: [], notes: '', expiryDate: format(subDays(new Date(), -7), 'yyyy-MM-dd') });
    toast.success('Orçamento criado com sucesso!');
  };

  const addItemToProp = (prodId) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;
    setNewProp(prev => ({
      ...prev,
      items: [...prev.items, { productId: prod.id, name: prod.name, price: prod.price, quantity: 1 }]
    }));
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM — Relacionamento</h1>
          <p className="page-subtitle">Funil de vendas, segmentação e score de clientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => toast('Exportando CSV...', { icon: '📊' })}>
            <Download size={16} /> Exportar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => toast('Novo cliente!', { icon: '👤' })}>
            <UserPlus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { icon: Users,        color: 'var(--primary-light)', bg: 'var(--primary-glow)', value: customers.length, label: 'Total Clientes', borderColor: 'var(--primary-light)' },
          { icon: Star,         color: '#F59E0B',              bg: 'rgba(245,158,11,0.15)', value: customers.filter(c => (c.tags || []).includes('VIP')).length, label: 'Clientes VIP', borderColor: '#F59E0B' },
          { icon: TrendingUp,   color: 'var(--success)',       bg: 'var(--success-bg)',   value: totalOrders > 0 ? `R$ ${(totalRevenue/totalOrders).toFixed(0)}` : 'R$ 0', label: 'Ticket Médio', borderColor: 'var(--success)' },
          { icon: AlertCircle,  color: 'var(--danger)',        bg: 'var(--danger-bg)',    value: customers.filter(c => (c.tags || []).some(t => t === 'Em Risco' || t === 'Inativo')).length, label: 'Em Risco/Inativos', borderColor: 'var(--danger)' },
        ].map(({ icon: Icon, color, bg, value, label, borderColor }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${borderColor}`, borderRadius: 'var(--radius)',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
        {['clientes', 'pipeline', 'orcamentos'].map(t => {
          const isRestricted = (t === 'pipeline' || t === 'orcamentos') && settings?.planId === 'starter';
          return (
            <button 
              key={t} 
              onClick={() => {
                if (isRestricted) {
                  toast.error('Pipeline e Orçamentos são exclusivos do plano Pro Business!', { icon: '🔒' });
                  return;
                }
                setTab(t);
              }} 
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
                color: tab === t ? 'var(--primary-light)' : (isRestricted ? 'var(--text-muted) opacity-30' : 'var(--text-muted)'),
                fontWeight: 600, fontSize: 14, cursor: isRestricted ? 'not-allowed' : 'pointer', 
                textTransform: 'capitalize',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              {t === 'clientes' ? '👥 Clientes' : t === 'pipeline' ? '📋 Pipeline' : '📄 Orçamentos'}
              {isRestricted && <Crown size={12} className="text-warning" />}
            </button>
          );
        })}
      </div>

      {/* Clientes */}
      {tab === 'clientes' && (
        <>
          <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 220 }}>
              <Search size={16} className="search-icon" />
              <input className="input-field" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {['all','vip','frequent','new','at_risk','inactive'].map((s, i) => {
              const labels = ['Todos','VIP','Frequentes','Novos','Em Risco','Inativos'];
              return (
                <button key={s} onClick={() => setSegment(s)} style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '1px solid', background: segment === s ? 'var(--primary-glow)' : 'var(--surface-2)',
                  borderColor: segment === s ? 'var(--primary)' : 'var(--border)',
                  color: segment === s ? 'var(--primary-light)' : 'var(--text-muted)',
                }}>{labels[i]}</button>
              );
            })}
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Contato</th><th>Score RFM</th>
                  <th>Pedidos</th><th>Total Gasto</th><th>Última Compra</th><th>Tags</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const score = getScore(c);
                  const lastDate = c.lastPurchase || c.createdAt || new Date().toISOString();
                  const days = differenceInDays(new Date(), new Date(lastDate));
                  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {c.name[0]}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12 }}>
                          <div className="flex items-center gap-2"><Phone size={11} color="var(--text-muted)" /> {c.phone}</div>
                          {c.email && <div className="flex items-center gap-2" style={{ marginTop: 3 }}><Mail size={11} color="var(--text-muted)" /> {c.email}</div>}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden', minWidth: 80 }}>
                            <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor, minWidth: 28 }}>{score}</span>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.ordersCount}</span></td>
                      <td><span style={{ fontWeight: 700, color: 'var(--success)' }}>R$ {c.totalSpent.toFixed(2)}</span></td>
                      <td>
                        <div style={{ fontSize: 13 }}>{format(new Date(lastDate), 'dd/MM/yyyy')}</div>
                        <div style={{ fontSize: 11, color: days > 30 ? 'var(--danger)' : 'var(--text-muted)' }}>{days === 0 ? 'Hoje' : `${days}d atrás`}</div>
                      </td>
                      <td>
                        <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
                          {(c.tags || []).map(t => {
                            const s = TAG_STYLES[t] || { bg: 'var(--surface-3)', color: 'var(--text-muted)' };
                            return <span key={t} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: s.bg, color: s.color }}>{t}</span>;
                          })}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toast(`Perfil de ${c.name}`, { icon: '👤' })}>
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pipeline Kanban */}
      {tab === 'pipeline' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn btn-primary btn-sm" onClick={() => setShowOpModal(true)}>
              <Plus size={14} /> Nova Oportunidade
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {ETAPAS.map(col => {
              const items = oportunidades.filter(o => o.etapa === col.id);
              const total = items.reduce((s, o) => s + parseFloat(o.valor || 0), 0);
              return (
                <div 
                  key={col.id} 
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    const id = e.dataTransfer.getData('text/plain');
                    handleMoveOpportunity(id, col.id);
                  }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', borderTop: `3px solid ${col.color}` }}>
                    <div style={{ fontWeight: 700 }}>{col.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{items.length} • R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {items.map(op => (
                      <div 
                        key={op.id} 
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', op.id);
                        }}
                        onClick={() => {
                          setSelectedOp(op);
                          setShowEditOpModal(true);
                        }}
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = col.color}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{op.titulo}</div>
                        {op.cliente_nome && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{op.cliente_nome}</div>}
                        <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, marginTop: 4 }}>
                          R$ {parseFloat(op.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> • {op.probabilidade}%</span>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--text-muted)', opacity: 0.5 }}>Vazio</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {showOpModal && (
            <div className="modal-overlay" onClick={() => setShowOpModal(false)}>
              <div className="modal-content glass" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">Nova Oportunidade</h2>
                  <button className="btn-close" onClick={() => setShowOpModal(false)}><X size={20} /></button>
                </div>
                <div className="modal-body">
                  <div className="form-group"><label className="form-label">Título *</label>
                    <input className="input-field" value={novaOp.titulo} onChange={e => setNovaOp(p => ({...p, titulo: e.target.value}))} /></div>
                  <div className="grid-2">
                    <div className="form-group"><label className="form-label">Valor (R$)</label>
                      <input className="input-field" type="number" value={novaOp.valor} onChange={e => setNovaOp(p => ({...p, valor: e.target.value}))} /></div>
                    <div className="form-group"><label className="form-label">Probabilidade (%)</label>
                      <input className="input-field" type="number" min="0" max="100" value={novaOp.probabilidade} onChange={e => setNovaOp(p => ({...p, probabilidade: Number(e.target.value)}))} /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Etapa</label>
                    <select className="input-field" value={novaOp.etapa} onChange={e => setNovaOp(p => ({...p, etapa: e.target.value}))}>
                      {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">Notas</label>
                    <textarea className="input-field" rows="2" value={novaOp.notas} onChange={e => setNovaOp(p => ({...p, notas: e.target.value}))} /></div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setShowOpModal(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={async () => {
                    if (!novaOp.titulo.trim()) { toast.error('Título é obrigatório'); return; }
                    try {
                      const res = await crmApi.criar({ ...novaOp, valor: parseFloat(novaOp.valor) || 0 });
                      if (res?.dados) { setOportunidades(prev => [res.dados, ...prev]); toast.success('Oportunidade criada!'); setShowOpModal(false); setNovaOp({ titulo: '', valor: '', etapa: 'lead', probabilidade: 50, notas: '' }); }
                    } catch { toast.error('Erro ao criar oportunidade.'); }
                  }}>Criar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orçamentos */}
      {tab === 'orcamentos' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <div className="search-wrap" style={{ width: 300 }}>
                <Search size={16} className="search-icon" />
                <input className="input-field" placeholder="Buscar orçamento..." />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
               <Plus size={14} /> Novo Orçamento
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nº</th><th>Data</th><th>Cliente</th><th>Validade</th><th>Total</th><th>Status</th><th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map(o => (
                  <tr key={o.id}>
                    <td><span style={{ fontWeight: 700 }}>#{String(o.number).padStart(3, '0')}</span></td>
                    <td>{o.date ? format(new Date(o.date), 'dd/MM/yyyy') : '—'}</td>
                    <td>{o.customerName}</td>
                    <td>
                      <span style={{ fontSize: 12, color: o.expiryDate && new Date(o.expiryDate) < new Date() ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {o.expiryDate ? format(new Date(o.expiryDate), 'dd/MM/yyyy') : '—'}
                      </span>
                    </td>
                    <td><span style={{ fontWeight: 700, color: 'var(--success)' }}>R$ {o.total.toFixed(2)}</span></td>
                    <td>
                      <span style={{ 
                        fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                        background: o.status === 'approved' ? 'var(--success-bg)' : o.status === 'pending' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                        color: o.status === 'approved' ? 'var(--success)' : o.status === 'pending' ? 'var(--warning)' : 'var(--danger)',
                      }}>
                        {o.status === 'approved' ? 'APROVADO' : o.status === 'pending' ? 'PENDENTE' : o.status === 'expired' ? 'EXPIRADO' : 'RECUSADO'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {o.status === 'pending' && (
                          <button className="btn btn-ghost btn-icon btn-sm" title="Aprovar e Gerar Pedido" 
                            onClick={() => {
                              convertProposalToOrder(o.id);
                              toast.success('Pedido gerado com sucesso!', { icon: '🚀' });
                            }}>
                            <Zap size={14} color="var(--primary-light)" />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" title="Imprimir PDF" onClick={() => toast('Gerando PDF...', { icon: '🖨️' })}>
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo Orçamento */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass" style={{ width: '100%', maxWidth: 700 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div style={{ padding: 8, background: 'var(--primary-glow)', borderRadius: 10, color: 'var(--primary-light)' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="modal-title">Novo Orçamento</h2>
                  <p className="text-xs text-muted">Crie uma proposta comercial detalhada</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="grid-2 mb-6">
                <div className="form-group">
                  <label className="form-label">Cliente</label>
                  <select 
                    className="input-field" 
                    value={newProp.customerId}
                    onChange={e => setNewProp({...newProp, customerId: e.target.value})}
                  >
                    <option value="">Selecione um cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Validade</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={newProp.expiryDate}
                    onChange={e => setNewProp({...newProp, expiryDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="form-label mb-2">Adicionar Itens</label>
                <div className="flex gap-2 mb-4">
                  <select 
                    className="input-field" 
                    onChange={e => {
                      if(e.target.value) {
                        addItemToProp(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">Buscar produto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} - R${p.price.toFixed(2)}</option>)}
                  </select>
                </div>

                <div className="table-wrapper" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  <table className="table-sm">
                    <thead>
                      <tr><th>Produto</th><th>Qtd</th><th>Preço</th><th>Total</th><th></th></tr>
                    </thead>
                    <tbody>
                      {newProp.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="text-xs">{item.name}</td>
                          <td>
                            <input 
                              type="number" 
                              className="input-field py-1 px-2 w-16 text-center"
                              value={item.quantity}
                              onChange={e => {
                                const items = [...newProp.items];
                                items[idx].quantity = parseInt(e.target.value) || 1;
                                setNewProp({...newProp, items});
                              }}
                            />
                          </td>
                          <td className="text-xs">R${item.price.toFixed(2)}</td>
                          <td className="text-xs font-bold text-success">R${(item.price * item.quantity).toFixed(2)}</td>
                          <td>
                            <button className="btn btn-ghost btn-icon btn-xs text-danger" onClick={() => {
                              const items = newProp.items.filter((_, i) => i !== idx);
                              setNewProp({...newProp, items});
                            }}>
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {newProp.items.length === 0 && (
                        <tr><td colSpan="5" className="text-center py-8 text-muted text-xs">Nenhum item adicionado</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações Internas / Notas para o Cliente</label>
                <textarea 
                  className="input-field" 
                  rows="3" 
                  placeholder="Ex: Entrega inclusa, condições de pagamento..."
                  value={newProp.notes}
                  onChange={e => setNewProp({...newProp, notes: e.target.value})}
                ></textarea>
              </div>
            </div>

            <div className="modal-footer flex justify-between items-center">
              <div>
                <span className="text-xs text-muted">Total da Proposta:</span>
                <div className="text-2xl font-bold text-success">
                  R$ {newProp.items.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleAddProposal}>Salvar Orçamento</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Editar Oportunidade */}
      {showEditOpModal && selectedOp && (
        <div className="modal-overlay" onClick={() => { setShowEditOpModal(false); setSelectedOp(null); }}>
          <div className="modal-content glass" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editar Oportunidade</h2>
              <button className="btn-close" onClick={() => { setShowEditOpModal(false); setSelectedOp(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input 
                  className="input-field" 
                  value={selectedOp.titulo} 
                  onChange={e => setSelectedOp(p => ({...p, titulo: e.target.value}))} 
                />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Valor (R$)</label>
                  <input 
                    className="input-field" 
                    type="number" 
                    value={selectedOp.valor} 
                    onChange={e => setSelectedOp(p => ({...p, valor: e.target.value}))} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Probabilidade (%)</label>
                  <input 
                    className="input-field" 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={selectedOp.probabilidade} 
                    onChange={e => setSelectedOp(p => ({...p, probabilidade: Number(e.target.value)}))} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Etapa</label>
                <select 
                  className="input-field" 
                  value={selectedOp.etapa} 
                  onChange={e => setSelectedOp(p => ({...p, etapa: e.target.value}))}
                >
                  {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea 
                  className="input-field" 
                  rows="2" 
                  value={selectedOp.notas || ''} 
                  onChange={e => setSelectedOp(p => ({...p, notas: e.target.value}))} 
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={async () => {
                if (window.confirm(`Tem certeza que deseja excluir a oportunidade "${selectedOp.titulo}"?`)) {
                  try {
                    await crmApi.remover(selectedOp.id);
                    setOportunidades(prev => prev.filter(o => o.id !== selectedOp.id));
                    toast.success('Oportunidade removida com sucesso!');
                    setShowEditOpModal(false);
                    setSelectedOp(null);
                  } catch {
                    toast.error('Erro ao excluir oportunidade.');
                  }
                }
              }}>
                Excluir
              </button>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => { setShowEditOpModal(false); setSelectedOp(null); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={async () => {
                  if (!selectedOp.titulo.trim()) { toast.error('Título é obrigatório'); return; }
                  try {
                    const res = await crmApi.editar(selectedOp.id, {
                      ...selectedOp,
                      valor: parseFloat(selectedOp.valor) || 0
                    });
                    if (res?.dados) {
                      setOportunidades(prev => prev.map(o => o.id === selectedOp.id ? res.dados : o));
                      toast.success('Oportunidade atualizada!');
                      setShowEditOpModal(false);
                      setSelectedOp(null);
                    }
                  } catch {
                    toast.error('Erro ao editar oportunidade.');
                  }
                }}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
