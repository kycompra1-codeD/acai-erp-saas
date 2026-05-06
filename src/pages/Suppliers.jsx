import { useState, useMemo } from 'react';
import { 
  Truck, Plus, Search, Edit2, Trash2, Phone, Mail, Package,
  MapPin, Building2, Star, Filter, DownloadCloud
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import PartnerModal from '../components/PartnerModal';
import toast from 'react-hot-toast';

function StarRating({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={12} fill={n <= value ? '#f59e0b' : 'none'} color={n <= value ? '#f59e0b' : 'var(--text-muted)'} />
      ))}
    </div>
  );
}

export default function Suppliers() {
  const { suppliers = [], companyId, addSupplier, updateSupplier, deleteSupplier } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCat, setFilterCat] = useState('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const categories = useMemo(() => 
    ['todas', ...Array.from(new Set(suppliers.map(s => s.category).filter(Boolean)))],
    [suppliers]
  );

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        (s.name || '').toLowerCase().includes(q) || 
        (s.contact || '').toLowerCase().includes(q) || 
        (s.category || '').toLowerCase().includes(q) ||
        (s.document && s.document.includes(searchTerm));
      
      const matchesCategory = filterCat === 'todas' || s.category === filterCat;
      
      return matchesSearch && matchesCategory;
    });
  }, [suppliers, searchTerm, filterCat]);

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter(s => s.status === 'ativo').length,
      categories: new Set(suppliers.map(s => s.category).filter(Boolean)).size
    };
  }, [suppliers]);

  const handleSave = (formData) => {
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, formData);
      toast.success('Fornecedor atualizado!');
    } else {
      addSupplier({
        ...formData,
        id: Date.now().toString(),
        companyId,
        createdAt: new Date().toISOString()
      });
      toast.success('Fornecedor cadastrado!');
    }
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Deseja realmente excluir este fornecedor?')) {
      deleteSupplier(id);
      toast.success('Fornecedor removido!');
    }
  };

  const fullAddress = (s) => [s.street, s.number, s.city, s.state].filter(Boolean).join(', ');

  return (
    <div className="animate-fade" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={24} style={{ color: '#f59e0b' }} />
            Fornecedores
          </h1>
          <p className="page-subtitle">Gestão estratégica de compras e suprimentos</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm">
            <DownloadCloud size={16} /> Exportar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setEditingSupplier(null); setIsModalOpen(true); }}>
            <Plus size={16} /> Novo Fornecedor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total de Fornecedores', value: stats.total, color: '#f59e0b', Icon: Truck },
          { label: 'Fornecedores Ativos', value: stats.active, color: 'var(--success)', Icon: Building2 },
          { label: 'Categorias', value: stats.categories, color: 'var(--primary-light)', Icon: Package },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${s.color}`, borderRadius: 'var(--radius)',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <s.Icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nome, documento ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input-field"
          style={{ minWidth: 180 }}
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          {categories.map(c => (
            <option key={c} value={c}>{c === 'todas' ? 'Todas Categorias' : c}</option>
          ))}
        </select>
        <button className="btn btn-secondary btn-icon"><Filter size={16} /></button>
      </div>

      {/* Suppliers Table */}
      <div className="table-wrapper">
          <table className="w-full">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>Contato</th>
                <th>Localização</th>
                <th>Avaliação</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSuppliers.map(s => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                        {(s.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                        {s.document && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CNPJ/CPF: {s.document}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary text-[10px]">{s.category || 'Geral'}</span>
                  </td>
                  <td>
                    <div className="space-y-1">
                      {s.phone && <div className="flex items-center gap-2 text-xs text-muted"><Phone size={12} /> {s.phone}</div>}
                      {s.email && <div className="flex items-center gap-2 text-xs text-muted"><Mail size={12} /> {s.email}</div>}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-xs text-muted max-w-[200px] truncate">
                      <MapPin size={12} className="shrink-0" /> {fullAddress(s) || 'Não informado'}
                    </div>
                  </td>
                  <td>
                    <StarRating value={s.rating || 5} />
                    <p className="text-[10px] text-muted mt-1">{s.paymentTerms || '30 dias'}</p>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(s)}><Edit2 size={16} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => handleDelete(s.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-20 text-muted italic">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      <PartnerModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSupplier(null); }}
        onSave={handleSave}
        initialData={editingSupplier}
        mode="supplier"
      />
    </div>
  );
}
