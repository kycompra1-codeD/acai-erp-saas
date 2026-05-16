// ============================================================
// FISCAL — Zullya ERP
// ============================================================
import { useState } from 'react';
import {
  FileText, Plus, Download, CheckCircle2, XCircle, Clock,
  Search, Eye, Printer, RefreshCw, AlertTriangle, DollarSign, Hash, Settings, Upload, Lock, ShieldCheck, Zap, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

const INITIAL_NOTAS = [
  { id: 'nf7', tipo: 'NFC-e', numero: '000005', serie: '001', status: 'rejeitada',  valor: 14.50,  cliente: 'Consumidor Final',   emissao: new Date().toISOString(),            protocolo: null, motivo: 'Rejeição 778: Informado NCM inexistente' },
  { id: 'nf1', tipo: 'NFC-e', numero: '000001', serie: '001', status: 'autorizada', valor: 48.90,  cliente: 'Consumidor Final',   emissao: new Date().toISOString(),            protocolo: '135260001234567' },
  { id: 'nf2', tipo: 'NFC-e', numero: '000002', serie: '001', status: 'autorizada', valor: 22.90,  cliente: 'Ana Beatriz',        emissao: new Date().toISOString(),            protocolo: '135260001234568' },
  { id: 'nf3', tipo: 'NF-e',  numero: '000001', serie: '001', status: 'autorizada', valor: 250.00, cliente: 'Empresa ABC LTDA',   emissao: subDays(new Date(), 1).toISOString(), protocolo: '135260001234569' },
  { id: 'nf4', tipo: 'NFC-e', numero: '000003', serie: '001', status: 'cancelada',  valor: 32.50,  cliente: 'Consumidor Final',   emissao: subDays(new Date(), 1).toISOString(), protocolo: '135260001234570' },
  { id: 'nf5', tipo: 'NF-e',  numero: '000002', serie: '001', status: 'pendente',   valor: 180.00, cliente: 'Fernanda Lima',      emissao: subDays(new Date(), 2).toISOString(), protocolo: null },
  { id: 'nf6', tipo: 'NFC-e', numero: '000004', serie: '001', status: 'autorizada', valor: 65.80,  cliente: 'Carlos Eduardo',     emissao: subDays(new Date(), 2).toISOString(), protocolo: '135260001234571' },
];

const STATUS_MAP = {
  autorizada: { label: 'Autorizada', cls: 'badge-success', icon: CheckCircle2, iconColor: 'var(--success)' },
  cancelada:  { label: 'Cancelada',  cls: 'badge-danger',  icon: XCircle,       iconColor: 'var(--danger)' },
  pendente:   { label: 'Pendente',   cls: 'badge-warning', icon: Clock,         iconColor: 'var(--warning)' },
  rejeitada:  { label: 'Rejeitada',  cls: 'badge-danger',  icon: AlertTriangle, iconColor: 'var(--danger)' },
};

export default function Fiscal() {
  const { settings, updateSettings } = useApp();
  const navigate = useNavigate();

  // Bloqueio por plano
  const isStarter = settings?.planId === 'starter';

  if (isStarter) {
    return (
      <div className="animate-fade flex flex-col items-center justify-center py-20 px-4 text-center glass-card border-warning/30 bg-warning/5 max-w-[600px] mx-auto">
        <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-6">
          <Crown className="text-warning" size={32} />
        </div>
        <h2 className="text-2xl font-black mb-3">Módulo Fiscal Indisponível</h2>
        <p className="text-muted mb-8 max-w-md">
          O emissor de NF-e e NFC-e é exclusivo para usuários do plano <strong>Pro Business</strong> ou superior. 
          Professionalize sua gestão fiscal hoje mesmo.
        </p>
        <div className="flex gap-4">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/subscription')}>
            Ver Planos de Upgrade
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  const [notas, setNotas] = useState(INITIAL_NOTAS);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [emitindo, setEmitindo] = useState(false);
  const [viewDanfe, setViewDanfe] = useState(null);
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showAutoModal, setShowAutoModal] = useState(false);

  // Forms and settings mock
  const [printerModel, setPrinterModel] = useState('generica');
  const [paperSize, setPaperSize] = useState('80mm');
  const [autoPrint, setAutoPrint] = useState(true);
  
  const [autoEmail, setAutoEmail] = useState('contabilidade@exemplo.com.br');
  const [autoDay, setAutoDay] = useState(1);
  const [autoEnabled, setAutoEnabled] = useState(true);
  
  const [emitForm, setEmitForm] = useState({ tipo: 'NFC-e', cliente: 'Consumidor Final', valor: '55.00' });
  const [certStatus, setCertStatus] = useState({ uploaded: true, expires: '10/10/2027' });
  const [certPass, setCertPass] = useState('');

  const downloadMock = (fileName, ext, content) => {
    const blob = new Blob([content], { type: ext === 'xml' ? 'application/xml' : 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Download de ${ext.toUpperCase()} concluído!`);
  };

  const filtered = notas.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = n.numero.includes(q) || n.cliente.toLowerCase().includes(q);
    const matchTipo   = filtroTipo === 'todos'   || n.tipo === filtroTipo;
    const matchStatus = filtroStatus === 'todos' || n.status === filtroStatus;
    
    let matchDate = true;
    const nDate = new Date(n.emissao).getTime();
    if (dateFrom) matchDate = matchDate && nDate >= new Date(dateFrom).getTime();
    if (dateTo) {
       const dtTo = new Date(dateTo);
       dtTo.setHours(23, 59, 59, 999);
       matchDate = matchDate && nDate <= dtTo.getTime();
    }
    
    return matchSearch && matchTipo && matchStatus && matchDate;
  });

  const totalAutorizadas = notas.filter(n => n.status === 'autorizada').reduce((s, n) => s + n.valor, 0);

  const handleConfirmEmit = () => {
    setShowEmitModal(false);
    setEmitindo(true);
    setTimeout(() => {
      const numero = String(notas.length + 1).padStart(6, '0');
      const nova = {
        id: `nf${Date.now()}`,
        tipo: emitForm.tipo, numero, serie: '001',
        status: 'autorizada',
        valor: parseFloat(emitForm.valor || 0),
        cliente: emitForm.cliente || 'Consumidor Final',
        emissao: new Date().toISOString(),
        protocolo: `13526000${Date.now().toString().slice(-8)}`,
      };
      setNotas(prev => [nova, ...prev]);
      setEmitindo(false);
      toast.success(`${nova.tipo} ${nova.numero} emitida e autorizada!`);
    }, 2000);
  };

  const cancelar = (id) => {
    setNotas(prev => prev.map(n => n.id === id ? { ...n, status: 'cancelada' } : n));
    toast.error('Nota cancelada.');
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={26} color="var(--primary-light)" /> Gestão Fiscal SaaS
          </h1>
          <p className="text-sm text-muted mt-1">NFe, NFCe e Manifestação de Destinatário</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>SEFAZ ON-LINE</span>
             </div>
             <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
             <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px', fontSize: 10, color: 'var(--warning)' }} onClick={() => toast.error('Contingência SCAN ativada!')}>
                <Zap size={12} /> ATIVAR CONTINGÊNCIA
             </button>
          </div>
          <button className="btn btn-secondary" onClick={() => setShowCertModal(true)}>
            <Lock size={16} /> Certificado A1
          </button>
          <button className="btn btn-primary" onClick={() => setShowEmitModal(true)} disabled={emitindo}>
            {emitindo ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            {emitindo ? 'Emitindo...' : 'Nova Emissão'}
          </button>
        </div>
      </div>
      </div>

      {/* Sefaz Monitor & Contingency (Inspirado no Olist) */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ 
          flex: 2, 
          minWidth: 300,
          background: 'var(--surface)', 
          borderRadius: 16, 
          border: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Monitor SEFAZ: Online</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tempo de resposta: 142ms • SVRS Autorizadora</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['NF-e', 'NFC-e', 'CT-e'].map(t => (
              <div key={t} style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                {t} OK
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          flex: 1, 
          minWidth: 200,
          background: 'var(--surface)', 
          borderRadius: 16, 
          border: '1px solid var(--border)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Modo Contingência</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Emissão em modo Offline</div>
          </div>
          <div 
            onClick={() => {
              const enabled = !settings.contingency;
              updateSettings({ contingency: enabled });
              if (enabled) toast.error('Modo Contingência Ativado: Notas serão autorizadas posteriormente.', { duration: 5000 });
              else toast.success('Operação Normal Restabelecida.');
            }}
            style={{ 
              width: 44, 
              height: 24, 
              borderRadius: 20, 
              background: settings.contingency ? 'var(--primary-light)' : 'var(--surface-4)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            <div style={{ 
              width: 18, 
              height: 18, 
              borderRadius: '50%', 
              background: '#fff', 
              position: 'absolute',
              top: 3,
              left: settings.contingency ? 23 : 3,
              transition: 'left 0.3s'
            }} />
          </div>
        </div>
      </div>

      {/* Aviso ambiente */}
      {settings.contingency ? (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="var(--danger)" />
          <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>
            ATENÇÃO: Sistema operando em contingência (EPEC/Off-line). Certifique-se de transmitir as notas assim que a conexão retornar.
          </span>
        </div>
      ) : (
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="var(--warning)" />
          <span style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600 }}>
            Ambiente de Homologação (Demo) — Notas não têm validade fiscal real
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', value: notas.filter(n => n.status === 'autorizada').length, label: 'Autorizadas' },
          { icon: Hash, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', value: notas.filter(n => n.tipo === 'NFC-e').length, label: 'NFC-e (PDV)' },
          { icon: FileText, color: 'var(--primary-light)', bg: 'rgba(168, 85, 247, 0.1)', value: notas.filter(n => n.tipo === 'NF-e').length, label: 'NF-e (Serviço)' },
          { icon: DollarSign, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', value: `R$ ${totalAutorizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, label: 'Total Emitido' },
        ].map(({ icon: Icon, color, bg, value, label }) => (
          <div key={label} className="glass-card p-5 flex items-center gap-4 border-white/5 transition-all hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg, border: `1px solid ${color}20` }}>
              <Icon size={24} style={{ color }} />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted opacity-80">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="glass-card p-4 mb-6 flex gap-3 flex-wrap border-white/5">
        <div className="search-wrap" style={{ flex: 2, minWidth: 260 }}>
          <Search size={18} className="search-icon text-muted" />
          <input 
            className="input-field bg-white/5 border-white/10" 
            placeholder="Buscar por número, série ou cliente..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" className="input-field bg-white/5 border-white/10 w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-muted font-bold">→</span>
          <input type="date" className="input-field bg-white/5 border-white/10 w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <select className="input-field bg-white/5 border-white/10 w-auto font-bold" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">📄 Todos os Tipos</option>
          <option value="NFC-e">🏷️ NFC-e</option>
          <option value="NF-e">🏢 NF-e</option>
        </select>
        <select className="input-field bg-white/5 border-white/10 w-auto font-bold" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">📊 Todos Status</option>
          <option value="autorizada">🟢 Autorizada</option>
          <option value="pendente">🟡 Pendente</option>
          <option value="cancelada">🔴 Cancelada</option>
          <option value="rejeitada">⚠️ Rejeitada</option>
        </select>
        <button className="btn btn-secondary btn-icon" onClick={() => toast.success('Filtros limpos!')}>
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabela */}
      <div className="glass-card overflow-hidden border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted">Tipo</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted">Documento</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted">Destinatário</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted">Valor Total</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted">Emissão</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted">Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-muted text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(n => {
                const st = STATUS_MAP[n.status] || STATUS_MAP.pendente;
                const StatusIcon = st.icon;
                return (
                  <tr key={n.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                        n.tipo === 'NFC-e' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {n.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-white">Nº {n.numero}</div>
                      <div className="text-[10px] font-bold text-muted uppercase">Série {n.serie}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-white">{n.cliente}</div>
                      <div className="text-[10px] font-medium text-muted truncate max-w-[120px]">ID: {n.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-emerald-400">R$ {n.valor.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-white">{format(new Date(n.emissao), 'dd/MM/yy')}</div>
                      <div className="text-[10px] font-medium text-muted">{format(new Date(n.emissao), 'HH:mm')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full w-fit border ${
                        n.status === 'autorizada' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        n.status === 'cancelada' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        n.status === 'rejeitada' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' :
                        'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        <StatusIcon size={12} />
                        <span className="text-[10px] font-black uppercase tracking-wider">{st.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="btn btn-ghost btn-icon btn-sm hover:bg-white/10" title="Visualizar" onClick={() => setViewDanfe(n)}>
                          <Eye size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm hover:bg-white/10" title="Imprimir" onClick={() => downloadMock(`nf_${n.numero}`, 'pdf', '%PDF-1.4 mock')}>
                          <Printer size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm hover:bg-white/10" title="XML" onClick={() => downloadMock(`nf_${n.numero}`, 'xml', '<nfe></nfe>')}>
                          <Download size={16} />
                        </button>
                        {n.status === 'autorizada' && (
                          <button className="btn btn-ghost btn-icon btn-sm hover:bg-rose-500/20 text-rose-400" title="Cancelar" onClick={() => cancelar(n.id)}>
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visualizador DANFE (Modal) - Estilo Premium */}
      {viewDanfe && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setViewDanfe(null)}>
          <div className="glass-card max-w-2xl w-full mx-4 p-0 overflow-hidden bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center text-slate-900">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-black">AÇ</div>
                 <div>
                   <div className="text-sm font-black uppercase">DANFE Simplificado</div>
                   <div className="text-[10px] font-bold opacity-60">NFC-e Eletrônica</div>
                 </div>
               </div>
               <button onClick={() => setViewDanfe(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <XCircle size={20} />
               </button>
            </div>
            
            <div className="p-8 text-slate-800 font-mono text-sm leading-relaxed overflow-y-auto max-h-[70vh]">
              <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                <div className="text-lg font-black tracking-tighter">Zullya ERP Premium</div>
                <div className="text-xs">CNPJ: 00.000.000/0001-91</div>
                <div className="text-xs uppercase">Rua do Sucesso, 777 - Digital City, SP</div>
              </div>

              <div className="flex justify-between font-black uppercase mb-4 text-[10px] text-slate-500">
                <span>Qtd</span>
                <span>Descrição</span>
                <span>Vl. Un</span>
                <span>Total</span>
              </div>

              <div className="space-y-2 mb-6">
                {[1, 2].map(i => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="w-8">01</span>
                    <span className="flex-1 px-2 font-bold uppercase">Item de Demonstração {i}</span>
                    <span className="w-20 text-right">15,90</span>
                    <span className="w-20 text-right font-black">15,90</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-slate-900 pt-4 mb-6">
                <div className="flex justify-between items-center text-lg font-black">
                  <span>VALOR TOTAL R$</span>
                  <span>{viewDanfe.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold mt-1 text-slate-500 uppercase">
                  <span>Forma de Pagamento</span>
                  <span>{viewDanfe.payment || 'PIX'}</span>
                </div>
              </div>

              <div className="bg-slate-100 p-4 rounded-lg text-[10px] text-center space-y-1">
                <div className="font-black text-slate-500">CHAVE DE ACESSO</div>
                <div className="break-all tracking-widest font-bold">3523 0400 0000 0000 0191 6500 1000 000{viewDanfe.numero} 1234 5678</div>
                <div className="pt-2 flex justify-center gap-4">
                  <div><strong>Nº:</strong> {viewDanfe.numero}</div>
                  <div><strong>SÉRIE:</strong> {viewDanfe.serie}</div>
                  <div><strong>DATA:</strong> {format(new Date(viewDanfe.emissao), 'dd/MM/yyyy')}</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button className="btn btn-secondary flex-1 font-black text-slate-900 border-slate-300" onClick={() => setViewDanfe(null)}>
                Fechar
              </button>
              <button className="btn btn-primary flex-1 font-black shadow-lg shadow-purple-500/20" onClick={() => { setViewDanfe(null); toast.success('DANFE enviado para impressão!'); }}>
                <Printer size={18} /> Imprimir Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outros Modais (Certificado, Automação, etc) */}
      {/* ... (mantendo lógica existente) ... */}

      {/* Modal: Configuração de Impressora */}
      {showPrinterConfig && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 450, padding: 30, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                 <Printer size={20} color="var(--primary)" /> Configurar Impressora
               </h3>
               <button onClick={() => setShowPrinterConfig(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <XCircle size={20} />
               </button>
            </div>
            
            <div className="form-group mb-4">
              <label className="form-label">Tamanho do Papel (Bobina)</label>
              <select className="input-field" value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                <option value="58mm">58mm (Bobina Estreita)</option>
                <option value="80mm">80mm (Bobina Larga Padrão)</option>
                <option value="A4">A4 (Folha Padrão)</option>
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Modelo de Impressora</label>
              <select className="input-field" value={printerModel} onChange={e => setPrinterModel(e.target.value)}>
                <option value="generica">Impressora Genérica (Padrão)</option>
                <option value="bematech">Bematech (Comandos ESC/POS)</option>
                <option value="elgin">Elgin (I9 / i8)</option>
                <option value="epson">Epson (TM-T20)</option>
              </select>
            </div>

            <div className="form-group mb-4" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <input type="checkbox" id="autoPrint" checked={autoPrint} onChange={e => setAutoPrint(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
               <label htmlFor="autoPrint" style={{ cursor: 'pointer', userSelect: 'none' }}>Imprimir automaticamente após autorização</label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
               <button className="btn btn-secondary flex-1" onClick={() => setShowPrinterConfig(false)}>Cancelar</button>
               <button className="btn btn-primary flex-1" onClick={() => { setShowPrinterConfig(false); toast.success('Configurações de impressora salvas!'); }}>Salvar Configurações</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Emissão de Nota */}
      {showEmitModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 450, padding: 30, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                 <Plus size={20} color="var(--primary)" /> Nova Emissão Avulsa
               </h3>
               <button onClick={() => setShowEmitModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <XCircle size={20} />
               </button>
            </div>
            
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
               Esta tela permite emitir uma nota avulsa. Em situações normais de PDV, as NFC-e são emitidas automaticamente ao finalizar a venda.
            </p>

            <div className="form-group mb-4">
              <label className="form-label">Tipo de Nota</label>
              <select className="input-field" value={emitForm.tipo} onChange={e => setEmitForm(prev => ({...prev, tipo: e.target.value}))}>
                <option value="NFC-e">NFC-e (Consumidor)</option>
                <option value="NF-e">NF-e (Serviço/Produto - B2B)</option>
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Nome do Cliente</label>
              <input className="input-field" value={emitForm.cliente} onChange={e => setEmitForm(prev => ({...prev, cliente: e.target.value}))} />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Valor Total (R$)</label>
              <input className="input-field" type="number" step="0.01" value={emitForm.valor} onChange={e => setEmitForm(prev => ({...prev, valor: e.target.value}))} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
               <button className="btn btn-secondary flex-1" onClick={() => setShowEmitModal(false)}>Cancelar</button>
               <button className="btn btn-primary flex-1" onClick={handleConfirmEmit}>Confirmar e Transmitir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Certificado Digital */}
      {showCertModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 450, padding: 30, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                 <Lock size={20} color="var(--primary)" /> Certificado Digital (A1)
               </h3>
               <button onClick={() => setShowCertModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <XCircle size={20} />
               </button>
            </div>
            
            {certStatus.uploaded ? (
               <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--success)' }}>
                     <CheckCircle2 size={24} />
                     <div>
                       <div style={{ fontWeight: 'bold' }}>Certificado Configurado</div>
                       <div style={{ fontSize: 12, marginTop: 4 }}>Válido até: {certStatus.expires}</div>
                     </div>
                  </div>
               </div>
            ) : (
               <div style={{ border: '2px dashed var(--border-color)', padding: 30, borderRadius: 8, textAlign: 'center', marginBottom: 20 }}>
                  <Upload size={30} color="var(--text-muted)" style={{ margin: '0 auto', marginBottom: 10 }} />
                  <div style={{ fontWeight: 500 }}>Upload do Certificado (.PFX)</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Arraste o arquivo A1 aqui</div>
               </div>
            )}

            <div className="form-group mb-4">
              <label className="form-label">Senha do Certificado</label>
              <input className="input-field" type="password" placeholder="***" value={certPass} onChange={e => setCertPass(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
               <button className="btn btn-secondary flex-1" onClick={() => setShowCertModal(false)}>Cancelar</button>
               <button className="btn btn-primary flex-1" onClick={() => { 
                  if(!certPass) return toast.error("Informe a senha.");
                  setCertStatus({ uploaded: true, expires: 'Novo Vencimento: 2028' });
                  toast.success('Certificado atualizado com sucesso!'); 
                  setShowCertModal(false); 
               }}>Salvar Certificado</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Automação Contábil */}
      {showAutoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 450, padding: 30, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                 <RefreshCw size={20} color="var(--primary)" /> Fechamento Contábil
               </h3>
               <button onClick={() => setShowAutoModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <XCircle size={20} />
               </button>
            </div>
            
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
               Configure o envio automático dos arquivos fiscais (XML) gerados no mês para o seu escritório de contabilidade.
            </p>

            <div className="form-group mb-4" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <input type="checkbox" id="autoEnabled" checked={autoEnabled} onChange={e => setAutoEnabled(e.target.checked)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
               <label htmlFor="autoEnabled" style={{ cursor: 'pointer', userSelect: 'none' }}>Ativar fechamento automático</label>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">E-mail da Contabilidade</label>
              <input className="input-field" type="email" placeholder="contador@..." disabled={!autoEnabled} value={autoEmail} onChange={e => setAutoEmail(e.target.value)} />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Dia do envio (mês subsequente)</label>
              <input className="input-field" type="number" min="1" max="10" disabled={!autoEnabled} value={autoDay} onChange={e => setAutoDay(Number(e.target.value))} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 30 }}>
               <button className="btn btn-secondary flex-1" onClick={() => setShowAutoModal(false)}>Cancelar</button>
               <button className="btn btn-primary flex-1" onClick={() => { 
                  setShowAutoModal(false); 
                  toast.success('Automação salva! Fechamento agendado.'); 
               }}>Salvar Automação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
