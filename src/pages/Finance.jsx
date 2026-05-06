import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, Search, Trash2, X, Save, DollarSign, BarChart2, ArrowUpCircle, ArrowDownCircle, ShieldCheck, ShoppingBag, Utensils, Percent, Calendar } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const INCOME_CATEGORIES = ['Vendas PDV', 'Delivery', 'Outros Serviços', 'Empréstimo', 'Outro'];
const EXPENSE_CATEGORIES = ['Fornecedores', 'Salários', 'Aluguel', 'Utilidades', 'Embalagens', 'Marketing', 'Manutenção', 'Impostos', 'Outros'];
const PAYMENT_METHODS = ['pix', 'dinheiro', 'cartão', 'transferência', 'boleto', 'débito automático', 'misto'];

const makeEmpty = () => ({
  type: 'receita',
  category: 'Vendas PDV',
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'pix',
  status: 'pago',
  recurring: false,
});

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

function safeParse(d) {
  try { return parseISO(d); } catch { return null; }
}

export default function Finance() {
  const { financeEntries = [], addFinanceEntry, deleteFinanceEntry } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(makeEmpty);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [tab, setTab] = useState('lancamentos');
  const [delId, setDelId] = useState(null);

  const upd = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Current month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonth = financeEntries.filter(e => {
    const d = safeParse(e.date);
    return d && isWithinInterval(d, { start: monthStart, end: monthEnd });
  });

  const totalReceitas = thisMonth.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalDespesas = thisMonth.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  const despesasByCategory = thisMonth.filter(e => e.type === 'despesa').reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
    return acc;
  }, {});

  const filtered = financeEntries.filter(e => {
    const q = search.toLowerCase();
    const match = (e.description || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q);
    return match && (typeFilter === 'todos' || e.type === typeFilter);
  });

  const openModal = () => {
    setForm(makeEmpty());
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSave = () => {
    if (!form.description?.trim()) { toast.error('Descrição é obrigatória!'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Valor inválido!'); return; }
    addFinanceEntry({ ...form, amount: parseFloat(form.amount) });
    toast.success(`${form.type === 'receita' ? 'Receita' : 'Despesa'} lançada!`);
    closeModal();
  };

  const handleDelete = () => {
    deleteFinanceEntry(delId);
    setDelId(null);
    toast.success('Lançamento excluído!');
  };

  return (
    <div className="animate-fade" style={{ paddingBottom: 40 }}>
      {/* Digital Account Header */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, var(--primary-dark) 0%, #1e1b4b 100%)', border: 'none', padding: 32, position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}><DollarSign size={200} /></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              <ShieldCheck size={16} /> CONTA DIGITAL AÇAÍ ERP SaaS
            </div>
            <div style={{ color: '#fff', fontSize: 32, fontWeight: 800 }}>{fmt(totalReceitas - totalDespesas + 15240)}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 }}>Saldo disponível para saque</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <button className="btn btn-primary" style={{ background: '#fff', color: 'var(--primary-dark)', border: 'none' }} onClick={() => toast.success('Solicitação de saque enviada!')}>
                <ArrowUpCircle size={16} /> Sacar para Banco
             </button>
             <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={openModal}>
                <Plus size={16} /> Novo Lançamento
             </button>
          </div>
        </div>
      </div>

      {/* Marketplace Reconciliation & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'A Receber (M. Livre)', value: 4250.80, icon: ShoppingBag, color: '#FFE600' },
          { label: 'A Receber (iFood)',    value: 1840.20, icon: Utensils,    color: '#EA1D2C' },
          { label: 'Taxas Retidas (Mês)',  value: 840.15,  icon: Percent,     color: 'var(--warning)' },
          { label: 'Previsão de Fluxo',    value: 21500.00,icon: Calendar,    color: 'var(--info)' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderLeft: `3px solid ${s.color}`, borderRadius: 'var(--radius)',
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
               <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={15} color={s.color} />
               </div>
               <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{fmt(s.value)}</div>
          </div>
        ))}
      </div>

      <div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, paddingTop: 16 }}>
          <button onClick={() => setTab('lancamentos')} className={`btn btn-sm ${tab === 'lancamentos' ? 'btn-primary' : 'btn-secondary'}`}>
             📊 Lançamentos Gerais
          </button>
          <button onClick={() => setTab('conciliacao')} className={`btn btn-sm ${tab === 'conciliacao' ? 'btn-primary' : 'btn-secondary'}`}>
             🤝 Conciliação de Marketplaces
          </button>
        </div>

        {tab === 'lancamentos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* DRE Simplificado */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
            <BarChart2 size={15} color="var(--primary-light)" /> DRE Simplificado
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#10b981' }}>
              <span>Receita Bruta</span><span>{fmt(totalReceitas)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(despesasByCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{cat}</span><span style={{ color: 'var(--danger)' }}>- {fmt(val)}</span>
                </div>
              ))}
              {Object.keys(despesasByCategory).length === 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sem despesas este mês</div>}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
              <span>Resultado</span>
              <span style={{ color: saldo >= 0 ? '#10b981' : 'var(--danger)' }}>{fmt(saldo)}</span>
            </div>
          </div>
          {totalReceitas > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>Margem Líquida</span>
                <span style={{ fontWeight: 700, color: saldo >= 0 ? '#10b981' : 'var(--danger)' }}>
                  {((saldo / totalReceitas) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, (saldo / totalReceitas) * 100))}%`, background: saldo >= 0 ? '#10b981' : 'var(--danger)', borderRadius: 3, transition: 'width 0.5s' }} />
              </div>
            </div>
          )}

          {/* Marketplace panels */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
            <h4 style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Conciliação Marketplace</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>A Receber (iFood)</span>
                  <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>R$ 1.250,00</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Previsão: Quarta-feira</div>
              </div>
              <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>A Receber (M. Livre)</span>
                  <span style={{ color: 'var(--primary-light)', fontWeight: 700 }}>R$ 840,50</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aguardando entrega</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Plus size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Antecipar Recebíveis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lançamentos */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input-field" style={{ paddingLeft: 30, fontSize: 13 }} placeholder="Buscar lançamento..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['todos', 'Todos'], ['receita', '↑ Receitas'], ['despesa', '↓ Despesas']].map(([t, l]) => (
                <button key={t} onClick={() => setTypeFilter(t)} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--text-muted)' }}>Nenhum lançamento encontrado</div>
            ) : filtered.map(entry => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--border)', transition: 'background 0.15s' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: entry.type === 'receita' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {entry.type === 'receita' ? <TrendingUp size={16} color="#10b981" /> : <TrendingDown size={16} color="var(--danger)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <span>{entry.category}</span>
                    <span>·</span>
                    <span>{entry.date ? (() => { const d = safeParse(entry.date); return d ? format(d, 'dd/MM/yyyy', { locale: ptBR }) : entry.date; })() : '—'}</span>
                    <span>·</span>
                    <span>{entry.paymentMethod}</span>
                    {entry.recurring && <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)', padding: '1px 5px', borderRadius: 10 }}>RECORRENTE</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: entry.type === 'receita' ? '#10b981' : 'var(--danger)' }}>
                    {entry.type === 'receita' ? '+' : '-'} {fmt(entry.amount)}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: entry.status === 'pago' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: entry.status === 'pago' ? '#10b981' : '#f59e0b', padding: '2px 6px', borderRadius: 10 }}>
                    {entry.status}
                  </span>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDelId(entry.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      ) : (
        <div className="glass-card p-0 overflow-hidden animate-fade">
          <div className="p-5 border-b border-border bg-surface-2 flex justify-between items-center">
            <div>
              <h3 className="font-bold">Conciliação de Repasses</h3>
              <p className="text-xs text-muted">Bata os valores recebidos dos marketplaces com seus pedidos</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => toast.success('Importando arquivo de repasse...')}>
               <Plus size={14} /> Importar Arquivo (.csv)
            </button>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-surface-3 text-xs text-muted">
                 <tr>
                   <th className="p-4">Pedido / Canal</th>
                   <th className="p-4">Valor Bruto</th>
                   <th className="p-4">Taxa Plataforma</th>
                   <th className="p-4">Impostos</th>
                   <th className="p-4">Líquido a Receber</th>
                   <th className="p-4 text-right">Status</th>
                 </tr>
               </thead>
               <tbody className="text-sm">
                  {[
                    { id: '#4521', canal: 'iFood', bruto: 54.90, taxa: 12.00, imp: 2.10, status: 'conciliado' },
                    { id: '#4520', canal: 'Mercado Livre', bruto: 129.00, taxa: 25.80, imp: 5.16, status: 'pendente' },
                    { id: '#4519', canal: 'Shopee', bruto: 89.90, taxa: 17.98, imp: 3.60, status: 'conciliado' },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border hover:bg-surface-2">
                       <td className="p-4">
                          <div className="font-bold">{row.id}</div>
                          <div className="text-xs text-muted">{row.canal}</div>
                       </td>
                       <td className="p-4">{fmt(row.bruto)}</td>
                       <td className="p-4 text-danger">- {fmt(row.taxa)}</td>
                       <td className="p-4 text-danger">- {fmt(row.imp)}</td>
                       <td className="p-4 font-bold text-success">{fmt(row.bruto - row.taxa - row.imp)}</td>
                       <td className="p-4 text-right">
                          <span className={`badge ${row.status === 'conciliado' ? 'badge-success' : 'badge-warning'}`}>
                             {row.status === 'conciliado' ? '✅ Conciliado' : '⏳ Pendente'}
                          </span>
                       </td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>
          <div className="p-4 bg-surface-2 text-right">
             <button className="btn btn-secondary btn-sm" onClick={() => toast.success('Conciliação em lote processada!')}>
                Conciliar Pendentes
             </button>
          </div>
        </div>
      )}
      </div>

      {/* Modal Novo Lançamento */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 className="text-lg font-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DollarSign size={20} color="#10b981" /> Novo Lançamento
              </h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}><X size={18} /></button>
            </div>

            {/* Tipo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['receita', 'despesa'].map(t => (
                <button key={t} onClick={() => upd('type', t) || upd('category', t === 'receita' ? 'Vendas PDV' : 'Fornecedores')}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: form.type === t ? (t === 'receita' ? '#10b981' : 'var(--danger)') : 'var(--surface-2)', color: form.type === t ? '#fff' : 'var(--text-muted)' }}>
                  {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Descrição *</label>
                <input className="input-field" value={form.description} onChange={e => upd('description', e.target.value)} placeholder="Ex: Vendas do dia, Compra de polpa..." />
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input className="input-field" type="number" step="0.01" min="0" value={form.amount} onChange={e => upd('amount', e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input className="input-field" type="date" value={form.date} onChange={e => upd('date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="input-field" value={form.category} onChange={e => upd('category', e.target.value)}>
                  {(form.type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select className="input-field" value={form.paymentMethod} onChange={e => upd('paymentMethod', e.target.value)}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="input-field" value={form.status} onChange={e => upd('status', e.target.value)}>
                  <option value="pago">Pago / Recebido</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
                <input id="recurring-chk" type="checkbox" checked={!!form.recurring} onChange={e => upd('recurring', e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="recurring-chk" className="text-sm" style={{ cursor: 'pointer' }}>Lançamento recorrente (mensal)</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave}><Save size={15} /> Lançar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card" style={{ padding: 24, maxWidth: 400, width: '100%', border: '1px solid var(--danger)' }}>
            <h3 style={{ fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Trash2 size={18} /> Excluir lançamento?</h3>
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
