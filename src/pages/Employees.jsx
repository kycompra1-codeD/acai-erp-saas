import { useState, useCallback, useRef } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, X, Save, Phone, Mail, MapPin,
  RefreshCw, Camera, DollarSign, Calendar, Hash, Upload, CheckCircle, Clock
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SHIFTS = ['manhã', 'tarde', 'noite', 'integral'];
const ROLES = [
  { key: 'admin', label: 'Administrador' },
  { key: 'gerente', label: 'Gerente' },
  { key: 'caixa', label: 'Operador(a) de Caixa' },
  { key: 'atendente', label: 'Atendente' },
  { key: 'producao', label: 'Produção / Cozinha' },
  { key: 'entregador', label: 'Entregador' },
  { key: 'limpeza', label: 'Limpeza / Auxiliar' },
];
const STATUS_OPTIONS = ['ativo', 'inativo', 'férias', 'afastado'];

const EMPTY = {
  name: '', cpf: '', role: 'atendente', jobTitle: '', shift: 'manhã',
  salary: '', phone: '', email: '', photo: null,
  cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', country: 'Brasil',
  hiredAt: new Date().toISOString().slice(0, 10),
  status: 'ativo', notes: ''
};

const STATUS_COLORS = { ativo: '#10b981', inativo: '#94a3b8', férias: '#f59e0b', afastado: '#ef4444' };

function fmtSalary(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function Employees() {
  const { employees = [], addEmployee, updateEmployee, deleteEmployee } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [delId, setDelId] = useState(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const fileRef = useRef(null);

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Foto muito grande (máx 3MB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => upd('photo', ev.target.result);
    reader.readAsDataURL(file);
  };

  // CEP lookup
  const fetchCep = useCallback(async () => {
    const cep = (form.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) { toast.error('CEP deve ter 8 dígitos'); return; }
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado'); return; }
      setForm(p => ({ ...p, street: data.logradouro || p.street, neighborhood: data.bairro || p.neighborhood, city: data.localidade || p.city, state: data.uf || p.state }));
      toast.success('Endereço preenchido!');
    } catch { toast.error('Erro ao buscar CEP'); }
    finally { setFetchingCep(false); }
  }, [form.cep]);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchQ = (e.name || '').toLowerCase().includes(q) || (e.jobTitle || '').toLowerCase().includes(q);
    const matchS = filterStatus === 'Todos' || e.status === filterStatus;
    return matchQ && matchS;
  });

  const stats = {
    total: employees.length,
    ativos: employees.filter(e => e.status === 'ativo').length,
    ferias: employees.filter(e => e.status === 'férias' || e.status === 'afastado').length,
    folha: employees.filter(e => e.status === 'ativo').reduce((s, e) => s + Number(e.salary || 0), 0),
  };

  const openNew = () => { setEditingId(null); setForm({ ...EMPTY }); setShowModal(true); };
  const openEdit = (emp) => { setEditingId(emp.id); setForm({ ...EMPTY, ...emp }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingId(null); setForm({ ...EMPTY }); };

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Nome é obrigatório'); return; }
    const data = { ...form, salary: Number(form.salary) || 0 };
    try {
      if (editingId) { await updateEmployee(editingId, data); toast.success('Funcionário atualizado!'); }
      else { await addEmployee(data); toast.success('Funcionário cadastrado!'); }
      closeModal();
    } catch { toast.error('Erro ao salvar. Tente novamente.'); }
  };

  const handleDelete = async () => {
    try { await deleteEmployee(delId); setDelId(null); toast.success('Funcionário removido!'); }
    catch { toast.error('Erro ao remover. Tente novamente.'); }
  };

  const shiftEmoji = { manhã: '🌅', tarde: '☀️', noite: '🌙', integral: '🔄' };

  return (
    <div className="animate-fade" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={24} style={{ color: 'var(--primary-light)' }} />
            Equipe &amp; Colaboradores
          </h1>
          <p className="page-subtitle">Gestão centralizada do capital humano</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          <Plus size={16} /> Novo Funcionário
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--primary-light)', icon: Users },
          { label: 'Ativos', value: stats.ativos, color: '#10b981', icon: CheckCircle },
          { label: 'Afastados/Férias', value: stats.ferias, color: '#f59e0b', icon: Clock },
          { label: 'Folha Mensal', value: fmtSalary(stats.folha), color: 'var(--accent)', icon: DollarSign, small: true },
        ].map(({ label, value, color, icon: Icon, small }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius)',
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: small ? 16 : 24, fontWeight: 900, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ paddingLeft: 36 }}
            placeholder="Buscar por nome, cargo ou CPF..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Todos', 'ativo', 'férias', 'afastado', 'inativo'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: filterStatus === s ? 'var(--primary)' : 'var(--border)',
                background: filterStatus === s ? 'var(--primary-glow)' : 'transparent',
                color: filterStatus === s ? 'var(--primary-light)' : 'var(--text-muted)',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
                {['Funcionário', 'Cargo / Turno', 'Contato', 'Admissão', 'Salário', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Users size={48} />
                      <p className="font-bold">Nenhum funcionário encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="group hover:bg-white/5 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-primary/50 transition-all shadow-lg" />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-black text-white shadow-lg border border-white/10">
                          {(emp.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-black text-white text-base">{emp.name}</div>
                        <div className="text-[10px] font-bold text-muted uppercase tracking-widest">{emp.cpf || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white/90">{emp.jobTitle || ROLES.find(r => r.key === emp.role)?.label || emp.role}</div>
                    <div className="text-[11px] font-medium text-muted/80 flex items-center gap-1.5 mt-1">
                      <span className="opacity-60">{shiftEmoji[emp.shift]}</span>
                      <span className="capitalize">{emp.shift}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white/80 flex items-center gap-2">
                        <Phone size={12} className="text-primary-light/60" />
                        {emp.phone || '—'}
                      </div>
                      <div className="text-[11px] font-medium text-muted/60 flex items-center gap-2">
                        <Mail size={12} />
                        {emp.email || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-muted/80">
                      <Calendar size={12} className="opacity-40" />
                      {emp.hiredAt ? (() => { try { return format(new Date(emp.hiredAt), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '—'; } })() : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-emerald-400 tracking-tight">
                      {fmtSalary(emp.salary)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm inline-flex items-center gap-1.5"
                      style={{ 
                        background: `${STATUS_COLORS[emp.status] || '#94a3b8'}15`, 
                        color: STATUS_COLORS[emp.status] || '#94a3b8',
                        border: `1px solid ${STATUS_COLORS[emp.status] || '#94a3b8'}30`
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: STATUS_COLORS[emp.status] }} />
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary-light transition-all text-muted" onClick={() => openEdit(emp)}><Edit2 size={14} /></button>
                      <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-danger/20 hover:text-danger transition-all text-muted" onClick={() => setDelId(emp.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', overflowY: 'auto' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 680, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="text-lg font-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={20} color="var(--primary-light)" />
                {editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>

            {/* Photo upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                {form.photo ? (
                  <img src={form.photo} alt="Foto" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
                ) : (
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', border: '3px solid var(--border)' }}>
                    {(form.name || '?')[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
                  title="Fazer upload de foto"
                >
                  <Camera size={12} />
                </button>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Foto do Funcionário</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>PNG ou JPG, máx. 3MB</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
                    <Camera size={13} /> Escolher Foto
                  </button>
                  {form.photo && (
                    <button type="button" className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)' }} onClick={() => upd('photo', null)}>Remover</button>
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </div>

            {/* Dados Pessoais */}
            <p className="text-xs font-bold text-muted uppercase mb-3" style={{ letterSpacing: '0.06em' }}>Dados Pessoais</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nome Completo *</label>
                <input className="input-field" value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Nome do funcionário" />
              </div>
              <div className="form-group">
                <label className="form-label">CPF</label>
                <input className="input-field" value={form.cpf} onChange={e => upd('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="form-group">
                <label className="form-label">Data de Admissão</label>
                <input className="input-field" type="date" value={form.hiredAt?.slice(0, 10) || ''} onChange={e => upd('hiredAt', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="input-field" value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="input-field" type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="func@email.com" />
              </div>
            </div>

            {/* Função */}
            <p className="text-xs font-bold text-muted uppercase mb-3" style={{ letterSpacing: '0.06em' }}>Função & Salário</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label">Função / Cargo</label>
                <select className="input-field" value={form.role} onChange={e => upd('role', e.target.value)}>
                  {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Título do Cargo</label>
                <input className="input-field" value={form.jobTitle} onChange={e => upd('jobTitle', e.target.value)} placeholder="Ex: Gerente de Operações" />
              </div>
              <div className="form-group">
                <label className="form-label">Turno</label>
                <select className="input-field" value={form.shift} onChange={e => upd('shift', e.target.value)}>
                  {SHIFTS.map(s => <option key={s} value={s}>{shiftEmoji[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Salário (R$)</label>
                <input className="input-field" type="number" step="0.01" value={form.salary} onChange={e => upd('salary', e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="input-field" value={form.status} onChange={e => upd('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Endereço */}
            <p className="text-xs font-bold text-muted uppercase mb-3" style={{ letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={12} /> Endereço</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label">CEP</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input-field" value={form.cep} onChange={e => upd('cep', e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))} placeholder="00000-000" maxLength={9} style={{ flex: 1 }} />
                  <button className="btn btn-secondary" type="button" onClick={fetchCep} disabled={fetchingCep} style={{ padding: '0 10px' }}>
                    <RefreshCw size={14} className={fetchingCep ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">País</label>
                <input className="input-field" value={form.country} onChange={e => upd('country', e.target.value)} placeholder="Brasil" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Rua / Logradouro</label>
                <input className="input-field" value={form.street} onChange={e => upd('street', e.target.value)} placeholder="Rua das Flores" />
              </div>
              <div className="form-group">
                <label className="form-label">Número</label>
                <input className="input-field" value={form.number} onChange={e => upd('number', e.target.value)} placeholder="123" />
              </div>
              <div className="form-group">
                <label className="form-label">Complemento</label>
                <input className="input-field" value={form.complement} onChange={e => upd('complement', e.target.value)} placeholder="Apto 12..." />
              </div>
              <div className="form-group">
                <label className="form-label">Bairro</label>
                <input className="input-field" value={form.neighborhood} onChange={e => upd('neighborhood', e.target.value)} placeholder="Centro" />
              </div>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input className="input-field" value={form.city} onChange={e => upd('city', e.target.value)} placeholder="São Paulo" />
              </div>
              <div className="form-group">
                <label className="form-label">Estado (UF)</label>
                <input className="input-field" value={form.state} onChange={e => upd('state', e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
              </div>
            </div>

            {/* Observações */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Observações</label>
              <textarea className="input-field" rows={2} value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Informações adicionais..." />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ padding: 24, maxWidth: 400, width: '100%', border: '1px solid var(--danger)' }}>
            <h3 style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 12 }}><Trash2 size={18} style={{ display: 'inline', marginRight: 8 }} /> Excluir funcionário?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>Esta ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setDelId(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
