import { useState, useMemo } from 'react';
import { 
  Users, Search, Plus, Mail, Phone, 
  MapPin, Edit2, Trash2, ShoppingBag, History, Award, Percent,
  TrendingUp, UserCheck, Star
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import PartnerModal from '../components/PartnerModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

function fmt(v) { return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`; }

function fmtDate(iso) {
  try { return format(new Date(iso), 'MMM yyyy', { locale: ptBR }); } catch { return '—'; }
}
function fmtDay(iso) {
  try { return format(new Date(iso), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '—'; }
}

const avatarColors = [
  'linear-gradient(135deg,#7C3AED,#5B21B6)',
  'linear-gradient(135deg,#3B82F6,#1D4ED8)',
  'linear-gradient(135deg,#10B981,#065F46)',
  'linear-gradient(135deg,#F59E0B,#B45309)',
  'linear-gradient(135deg,#EC4899,#BE185D)',
];

function Avatar({ name, size = 36 }) {
  const idx = name ? name.charCodeAt(0) % avatarColors.length : 0;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarColors[idx],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#fff',
      flexShrink: 0,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function Customers() {
  const { customers, companyId, addCustomer, updateCustomer, deleteCustomer, orders } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch =
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm));
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [customers, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: customers.length,
      active: customers.filter(c => c.status === 'ativo').length,
      newThisMonth: customers.filter(c => {
        const d = new Date(c.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      avgTicket: customers.reduce((a, c) => a + (c.totalSpent || 0), 0) / (customers.length || 1),
    };
  }, [customers]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(o => o.customerId === selectedCustomer.id).slice(0, 10);
  }, [selectedCustomer, orders]);

  const handleSave = (formData) => {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
      toast.success('Cliente atualizado!');
    } else {
      addCustomer({ ...formData, id: Date.now().toString(), companyId, createdAt: new Date().toISOString(), points: 0, totalSpent: 0, ordersCount: 0 });
      toast.success('Cliente cadastrado!');
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleEdit = (c) => { setEditingCustomer(c); setIsModalOpen(true); };
  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteCustomer(id);
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
      toast.success('Cliente excluído!');
    }
  };

  const fullAddress = (c) => [c.street, c.number, c.complement, c.neighborhood, c.city, c.state].filter(Boolean).join(', ');

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} style={{ color: 'var(--primary-light)' }} />
            Clientes
          </h1>
          <p className="page-subtitle">Gerencie sua base de clientes e histórico de pedidos</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total de Clientes', value: stats.total, color: 'var(--primary-light)', Icon: Users },
          { label: 'Clientes Ativos', value: stats.active, color: 'var(--success)', Icon: UserCheck },
          { label: 'Novos este Mês', value: stats.newThisMonth, color: '#3b82f6', Icon: TrendingUp },
          { label: 'Ticket Médio', value: fmt(stats.avgTicket), color: '#f59e0b', Icon: Star },
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

      {/* Main layout: list + detail */}
      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 340px)', minHeight: 400 }}>
        {/* List Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Search + Filters */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input-field"
                style={{ paddingLeft: 36 }}
                placeholder="Buscar por nome, telefone ou e-mail..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {['all', 'ativo', 'inativo'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: filterStatus === s ? 'var(--primary)' : 'var(--border)',
                background: filterStatus === s ? 'var(--primary-glow)' : 'transparent',
                color: filterStatus === s ? 'var(--primary-light)' : 'var(--text-muted)',
              }}>
                {s === 'all' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="table-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Pedidos</th>
                  <th>Pontos</th>
                  <th>Status</th>
                  <th>Gasto Total</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    style={{
                      cursor: 'pointer',
                      background: selectedCustomer?.id === c.id ? 'var(--surface-2)' : '',
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={c.name} size={32} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                          {c.document && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.document}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>{c.phone}</div>
                      {c.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>}
                    </td>
                    <td style={{ fontSize: 14, fontWeight: 600 }}>{c.ordersCount || 0}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary-light)', fontWeight: 700 }}>
                        <Award size={12} /> {c.points || 0}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'ativo' ? 'badge-success' : 'badge-muted'}`}>
                        {c.status || 'ativo'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{fmt(c.totalSpent || 0)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); handleEdit(c); }}><Edit2 size={13} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); handleDelete(c.id); }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length === 0 && (
              <div className="empty-state"><Users size={32} style={{ opacity: 0.2 }} /><p>Nenhum cliente encontrado</p></div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div style={{
          width: 360, flexShrink: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {selectedCustomer ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
              {/* Avatar + Nome */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <Avatar name={selectedCustomer.name} size={72} />
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800 }}>{selectedCustomer.name}</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Cliente desde {fmtDate(selectedCustomer.createdAt)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span className="badge badge-primary"><Award size={12} /> {selectedCustomer.points || 0} Pts</span>
                  {selectedCustomer.discount > 0 && (
                    <span className="badge badge-success"><Percent size={11} /> {selectedCustomer.discount}% desc.</span>
                  )}
                </div>
              </div>

              {/* Mini stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Total Gasto', value: fmt(selectedCustomer.totalSpent || 0) },
                  { label: 'Pedidos', value: selectedCustomer.ordersCount || 0 },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', textAlign: 'center', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Contato */}
              <div>
                <h3 style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Informações de Contato</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {selectedCustomer.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <Phone size={13} color="var(--primary-light)" />
                      {selectedCustomer.phone}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <Mail size={13} color="var(--primary-light)" />
                      {selectedCustomer.email}
                    </div>
                  )}
                  {fullAddress(selectedCustomer).length > 2 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <MapPin size={13} color="var(--primary-light)" style={{ marginTop: 1, flexShrink: 0 }} />
                      {fullAddress(selectedCustomer)}
                    </div>
                  )}
                </div>
              </div>

              {/* Histórico */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <History size={14} color="var(--primary-light)" /> Histórico Recente
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {customerOrders.length > 0 ? customerOrders.map(o => (
                    <div key={o.id} style={{
                      background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px', border: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Pedido #{o.number}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDay(o.createdAt)}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-light)' }}>{fmt(o.total)}</div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '24px 0', opacity: 0.4, fontSize: 13 }}>
                      Sem histórico disponível
                    </div>
                  )}
                </div>
              </div>

              {/* Ação */}
              <button className="btn btn-primary w-full" onClick={() => navigate(`/pos?cid=${selectedCustomer.id}`)}>
                <ShoppingBag size={15} /> Novo Pedido para este Cliente
              </button>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.35, gap: 12, padding: 24 }}>
              <Users size={56} strokeWidth={1} />
              <p style={{ fontSize: 14, textAlign: 'center' }}>Selecione um cliente para ver detalhes</p>
            </div>
          )}
        </div>
      </div>

      <PartnerModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCustomer(null); }}
        onSave={handleSave}
        initialData={editingCustomer}
        mode="customer"
      />
    </div>
  );
}
