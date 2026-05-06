import {
  Store, MapPin, Phone, Mail, Clock, DollarSign,
  Award, Shield, Bell, Save, Trash2, LogOut,
  Laptop, Globe, Cpu, Usb, Wifi, Printer,
  Scale, TestTube, CheckCircle, XCircle,
  FileText, Image, AlignLeft, QrCode, Type, RefreshCw,
  Link2, Video, CreditCard, LayoutGrid, Crown,
  ShieldCheck, Users, ShoppingBag, TrendingUp, Zap,
  Building2, Plus, Edit3
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { scaleSimulator } from '../services/scaleSimulator';
import { printService } from '../services/printService';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

export default function Settings() {
  const { settings, updateSettings, resetToDemoData, companies, addCompany, updateCompany, activeCompanyId } = useApp();
  const { logout } = useAuth();
  const [form, setForm] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    return params.get('tab') || 'unidades';
  });
  const [activeExtensions, setActiveExtensions] = useState(settings?.activeExtensions || ['hub', 'crm', 'reports', 'logistics']);
  
  // State for Company Management
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyForm, setCompanyForm] = useState({ 
    name: '', document: '', address: '', phone: '', email: '', website: '',
    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
    instagram: '', tiktok: '', youtube: '', hours: {} 
  });

  // Update form when settings change (important for company switching)
  useEffect(() => {
    setForm({ ...settings });
  }, [settings, activeCompanyId]);

  const toggleExtension = (id) => {
    setActiveExtensions(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  // Config de hardware
  const [hwConfig, setHwConfig] = useState({
    scaleEnabled: false,
    scalePort: 'COM3',
    scaleBaudRate: '9600',
    scaleProtocol: 'serial',
    scaleTcpHost: '192.168.1.100',
    scaleTcpPort: '8000',
    printerEnabled: true,
    printerMode: 'browser',
    printerTcpHost: '192.168.1.200',
    printerTcpPort: '9100',
    acaiPricePerKg: 45.00,
    // Kitchen printer
    kitchenPrinterEnabled: settings?.kitchenPrinterEnabled ?? false,
    kitchenPrinterMode: settings?.kitchenPrinterMode ?? 'browser',
    kitchenPrinterTcpHost: settings?.kitchenPrinterTcpHost ?? '192.168.1.201',
    kitchenPrinterTcpPort: settings?.kitchenPrinterTcpPort ?? '9100',
    kitchenPrinterWidth: settings?.kitchenPrinterWidth ?? '80mm',
  });
  const [scaleTestStatus, setScaleTestStatus] = useState(null); // null | 'ok' | 'fail'
  const [printerTestStatus, setPrinterTestStatus] = useState(null);
  const [kitchenPrinterTestStatus, setKitchenPrinterTestStatus] = useState(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState({
    mercadoPagoEnabled: settings?.paymentConfig?.mercadoPagoEnabled ?? false,
    mercadoPagoToken: settings?.paymentConfig?.mercadoPagoToken ?? '',
    mercadoPagoDeviceId: settings?.paymentConfig?.mercadoPagoDeviceId ?? '',
    pixEnabled: settings?.paymentConfig?.pixEnabled ?? true,
    pixKeyType: settings?.paymentConfig?.pixKeyType ?? 'cnpj',
    pixKey: settings?.paymentConfig?.pixKey ?? '',
    tefEnabled: settings?.paymentConfig?.tefEnabled ?? false,
    tefIp: settings?.paymentConfig?.tefIp ?? '127.0.0.1'
  });
  const [paymentTestStatus, setPaymentTestStatus] = useState(null);

  const handleSave = () => {
    updateSettings({ ...form, ...hwConfig, paymentConfig, activeExtensions });
    // Aplica config nos serviços
    scaleSimulator.configure({
      port: hwConfig.scalePort,
      baudRate: parseInt(hwConfig.scaleBaudRate),
      protocol: hwConfig.scaleProtocol,
      tcpHost: hwConfig.scaleTcpHost,
      tcpPort: parseInt(hwConfig.scaleTcpPort),
    });
    printService.configure({
      enabled: hwConfig.printerEnabled,
      mode: hwConfig.printerMode,
      tcpHost: hwConfig.printerTcpHost,
      tcpPort: parseInt(hwConfig.printerTcpPort),
      storeName: form.storeName,
    });
    toast.success('Configurações salvas com sucesso!');
  };

  const testScale = () => {
    setScaleTestStatus(null);
    toast.loading('Testando conexão com a balança...');
    // Simula teste de conexão (em produção: tenta abrir porta serial)
    setTimeout(() => {
      toast.dismiss();
      if (hwConfig.scaleProtocol === 'simulator' || hwConfig.scalePort === 'SIM') {
        setScaleTestStatus('ok');
        toast.success('Balança simulada OK!');
      } else {
        // Simula falha para porta real (sem hardware)
        setScaleTestStatus('fail');
        toast.error(`Porta ${hwConfig.scalePort} não encontrada (hardware não conectado)`);
      }
    }, 1500);
  };

  const testPrinter = () => {
    updateSettings({ ...form });
    setTimeout(() => {
      printService.printTest();
      setPrinterTestStatus('ok');
      toast.success('Cupom de teste aberto! (permita pop-ups se necessário)');
    }, 200);
  };

  const testKitchenPrinter = () => {
    updateSettings({ ...form, ...hwConfig });
    setTimeout(() => {
      const pw = window.open('', '_blank', 'width=600,height=800');
      if (!pw) { toast.error('Pop-up bloqueado! Permita pop-ups para este site.'); return; }
      const storeName = form.storeName || 'AcaiBom';
      const now = new Date().toLocaleString('pt-BR');
      const font = form.kitchenFont || 'monospace';
      const fsNum = parseInt(form.kitchenFontSize || '13', 10);
      const fontWeight = form.kitchenFontWeight || 'normal';
      const width = hwConfig.kitchenPrinterWidth || '80mm';
      const bigFs = String(fsNum + 4) + 'px';
      const timeFs = String(fsNum - 1) + 'px';
      const footFs = String(fsNum - 2) + 'px';
      const bodyFs = String(fsNum) + 'px';
      const css = [
        'body{font-family:' + font + ';padding:16px;max-width:' + width + ';margin:0 auto;font-size:' + bodyFs + ';font-weight:' + fontWeight + ';color:#000 !important;background:#fff;-webkit-font-smoothing:none;text-shadow:0 0 1px rgba(0,0,0,0.5);}',
        '.big{font-size:' + bigFs + ';font-weight:900;text-align:center;color:#000;letter-spacing:2px;}',
        '.time{text-align:center;font-size:' + timeFs + ';font-weight:bold;margin-bottom:8px}',
        '.sub{padding-left:12px;font-weight:bold;}',
        '.foot{text-align:center;font-size:' + footFs + ';font-weight:bold;}',
        'hr{border:none;border-top:1px dashed #000;margin:8px 0;}',
      ].join('');
      const html = '<html><head><title>Cozinha</title><style>' + css + '</style></head>'
        + '<body onload="window.print()">'
        + '<div class="big">PEDIDO #0042</div>'
        + '<div class="time">' + now + '</div>'
        + '<hr/>'
        + '<div>1x <strong>Acai 500ml</strong></div>'
        + '<div class="sub">+ Granola</div>'
        + '<div class="sub">+ Morango</div>'
        + '<div>1x <strong>Acai 300ml</strong></div>'
        + '<hr/>'
        + '<div class="foot">BALCAO &mdash; ' + storeName + '</div>'
        + '</body></html>';
      pw.document.write(html);
      pw.document.close();
      setKitchenPrinterTestStatus('ok');
      toast.success('Cupom de cozinha aberto!');
    }, 200);
  };

  const testPayment = () => {
    setPaymentTestStatus(null);
    toast.loading('Testando integração de pagamento...');
    setTimeout(() => {
      toast.dismiss();
      if (paymentConfig.tefEnabled) {
        setPaymentTestStatus('ok');
        toast.success('Conexão TEF simulada com sucesso!');
      } else if (paymentConfig.mercadoPagoEnabled && paymentConfig.mercadoPagoToken) {
        setPaymentTestStatus('ok');
        toast.success('Credenciais do Mercado Pago validadas!');
      } else if (paymentConfig.pixEnabled && paymentConfig.pixKey) {
        setPaymentTestStatus('ok');
        toast.success('Chave PIX validada!');
      } else {
        setPaymentTestStatus('fail');
        toast.error('Nenhum método habilitado com credenciais válidas.');
      }
    }, 1500);
  };

  const tabs = [
    { id: 'unidades',  label: 'Unidades',    icon: Building2 },
    { id: 'financial', label: 'Financeiro',  icon: DollarSign },
    { id: 'payments',  label: 'Pagamentos',  icon: CreditCard },
    { id: 'loyalty',   label: 'Fidelidade',  icon: Award },
    { id: 'hardware',  label: 'Hardware',    icon: Cpu },
    { id: 'print',     label: 'Impressão',  icon: Printer },
    { id: 'extensions',label: 'Extensões',   icon: LayoutGrid },
    { id: 'subscription', label: 'Assinatura', icon: Crown },
    { id: 'system',    label: 'Sistema',     icon: Laptop },
  ];

  return (
    <div className="animate-fade lg:flex gap-8 items-start max-w-[1400px] mx-auto pb-12">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-[280px] flex flex-col mb-6 lg:mb-0 glass-card p-4 sticky top-6 lg:min-h-[calc(100vh-120px)]">
        <div className="mb-6 px-2">
          <h2 className="text-xl font-bold gradient-text">Configurações</h2>
          <p className="text-sm text-muted mt-1">Gerencie seu sistema</p>
        </div>
        
        <div className="flex flex-col flex-1" style={{ gap: '4px' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-link w-full text-left border-none outline-none justify-start cursor-pointer select-none ${isActive ? 'active' : ''}`}
                style={{ backgroundColor: isActive ? '' : 'transparent' }}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
                {tab.id === 'hardware' && (
                  <span className="ml-auto badge badge-warning">Novo</span>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 pt-4 border-t border-border">
          {!showLogoutConfirm ? (
            <div 
              className="nav-link w-full text-left border-none outline-none justify-start text-danger hover:bg-danger-bg hover:text-danger cursor-pointer select-none" 
              style={{ color: 'var(--danger)', backgroundColor: 'transparent' }}
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut size={18} />
              <span>Sair do Sistema</span>
            </div>
          ) : (
            <div className="animate-fade bg-surface-2 p-4 rounded-lg border border-border mt-2">
              <p className="text-sm font-bold text-danger mb-4 text-center">Encerrar sessão?</p>
              <div className="flex items-center gap-2">
                <button 
                  className="btn btn-danger flex-1 py-2 text-xs"
                  onClick={() => logout()}
                >
                  Sim, Sair
                </button>
                <button 
                  className="btn btn-secondary flex-1 py-2 text-xs"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 glass-card p-6 lg:p-10 overflow-hidden">


        {/* ====== ABA UNIDADES ====== */}
        {activeTab === 'unidades' && (
          <div className="space-y-8 animate-fade">
            <div className="flex items-center justify-between border-b border-border pb-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Building2 className="text-primary-light" size={28} />
                  Gerenciamento de Unidades
                </h3>
                <p className="text-sm text-muted mt-1">Gerencie suas filiais e pontos de venda (Multi-empresa).</p>
              </div>
              <button 
                className="btn btn-primary flex items-center gap-2"
                onClick={() => {
                  setEditingCompany(null);
                  setCompanyForm({ 
                    name: '', document: '', address: '', phone: '', email: '', website: '',
                    cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '',
                    instagram: '', tiktok: '', youtube: '', hours: {} 
                  });
                  setIsCompanyModalOpen(true);
                }}
              >
                <Plus size={18} /> Adicionar Unidade
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map(company => (
                <div key={company.id} className="glass-card p-5 relative group border-primary/20 border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{company.name}</h4>
                      <p className="text-xs text-muted">{company.document}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-xs flex items-center gap-2 text-muted-foreground">
                      <MapPin size={12} /> {company.address}
                    </p>
                    <p className="text-xs flex items-center gap-2 text-muted-foreground">
                      <Shield size={12} /> ID: {company.id}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      activeCompanyId === company.id ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {activeCompanyId === company.id ? 'UNIDADE ATUAL' : 'FILIAL'}
                    </span>
                    <button 
                      className="btn btn-ghost btn-xs text-primary"
                      onClick={() => {
                        setEditingCompany(company);
                        setCompanyForm({ 
                          name: company.name || '', 
                          document: company.document || '', 
                          address: company.address || '',
                          phone: company.phone || '',
                          email: company.email || '',
                          website: company.website || '',
                          cep: company.cep || '',
                          street: company.street || '',
                          number: company.number || '',
                          complement: company.complement || '',
                          neighborhood: company.neighborhood || '',
                          city: company.city || '',
                          state: company.state || '',
                          instagram: company.instagram || '',
                          tiktok: company.tiktok || '',
                          youtube: company.youtube || '',
                          hours: company.hours || {}
                        });
                        setIsCompanyModalOpen(true);
                      }}
                    >
                      <Edit3 size={14} className="mr-1" /> Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {isCompanyModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-border bg-muted/30">
                    <h4 className="text-xl font-bold">{editingCompany ? 'Editar Unidade' : 'Nova Unidade'}</h4>
                    <p className="text-sm text-muted">Preencha os dados da filial.</p>
                  </div>
                  
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group md:col-span-2">
                        <label className="form-label text-white">Nome da Unidade</label>
                        <input className="input-field" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} placeholder="Ex: Açaí ERP SaaS - Shopping Sul" />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-white">CNPJ / Documento</label>
                        <input className="input-field" value={companyForm.document} onChange={e => setCompanyForm({...companyForm, document: e.target.value})} placeholder="00.000.000/0001-00" />
                      </div>
                      <div className="form-group">
                        <label className="form-label text-white">Telefone</label>
                        <input className="input-field" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} placeholder="(11) 99999-9999" />
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-bold flex items-center gap-2 mb-4"><MapPin size={14} className="text-primary" /> Endereço</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                          <label className="form-label">CEP</label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input className="input-field" style={{ flex: 1 }} value={companyForm.cep}
                              onChange={e => setCompanyForm({...companyForm, cep: e.target.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9)})}
                              placeholder="00000-000" maxLength={9} />
                            <button className="btn btn-secondary" type="button" title="Buscar CEP" disabled={fetchingCep}
                              onClick={async () => {
                                const cep = (companyForm.cep||'').replace(/\D/g,'');
                                if (cep.length !== 8) { toast.error('CEP inválido'); return; }
                                setFetchingCep(true);
                                try {
                                  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                  const data = await res.json();
                                  if (data.erro) { toast.error('CEP não encontrado'); return; }
                                  setCompanyForm(p => ({ 
                                    ...p, 
                                    street: data.logradouro || p.street, 
                                    neighborhood: data.bairro || p.neighborhood, 
                                    city: data.localidade || p.city, 
                                    state: data.uf || p.state,
                                    address: `${data.logradouro || p.street}, ${p.number} - ${data.bairro || p.neighborhood}`
                                  }));
                                  toast.success('Endereço preenchido!');
                                } catch { toast.error('Erro ao buscar CEP'); }
                                finally { setFetchingCep(false); }
                              }}>
                              <RefreshCw size={14} className={fetchingCep ? 'animate-spin' : ''} />
                            </button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Endereço Completo (Display)</label>
                          <input className="input-field" value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})} placeholder="Para exibição em cupons" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Rua / Logradouro</label>
                          <input className="input-field" value={companyForm.street} onChange={e => setCompanyForm({...companyForm, street: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Número</label>
                          <input className="input-field" value={companyForm.number} onChange={e => setCompanyForm({...companyForm, number: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Bairro</label>
                          <input className="input-field" value={companyForm.neighborhood} onChange={e => setCompanyForm({...companyForm, neighborhood: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Cidade</label>
                          <input className="input-field" value={companyForm.city} onChange={e => setCompanyForm({...companyForm, city: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-bold flex items-center gap-2 mb-4"><Globe size={14} className="text-primary" /> Redes Sociais</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                          <label className="form-label flex items-center gap-2"><Globe size={13} /> Website</label>
                          <input className="input-field" value={companyForm.website} onChange={e => setCompanyForm({...companyForm, website: e.target.value})} placeholder="https://acaierp.com.br" />
                        </div>
                        <div className="form-group">
                          <label className="form-label flex items-center gap-2"><Link2 size={13} /> Instagram</label>
                          <input className="input-field" value={companyForm.instagram} onChange={e => setCompanyForm({...companyForm, instagram: e.target.value})} placeholder="@acaierp_saas" />
                        </div>
                        <div className="form-group">
                          <label className="form-label flex items-center gap-2"><span style={{fontSize:13}}>🎵</span> TikTok</label>
                          <input className="input-field" value={companyForm.tiktok} onChange={e => setCompanyForm({...companyForm, tiktok: e.target.value})} placeholder="@acaibom" />
                        </div>
                        <div className="form-group">
                          <label className="form-label flex items-center gap-2"><Video size={13} /> YouTube</label>
                          <input className="input-field" value={companyForm.youtube} onChange={e => setCompanyForm({...companyForm, youtube: e.target.value})} placeholder="youtube.com/@acaibom" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-bold flex items-center gap-2 mb-4"><Clock size={14} className="text-primary" /> Horários de Funcionamento</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { key: 'seg', label: 'Segunda-feira' },
                          { key: 'ter', label: 'Terça-feira' },
                          { key: 'qua', label: 'Quarta-feira' },
                          { key: 'qui', label: 'Quinta-feira' },
                          { key: 'sex', label: 'Sexta-feira' },
                          { key: 'sab', label: 'Sábado' },
                          { key: 'dom', label: 'Domingo' },
                        ].map(({ key, label }) => {
                          const dayKey = `hours_${key}`;
                          const openKey = `hours_${key}_open`;
                          const closeKey = `hours_${key}_close`;
                          const isClosed = companyForm[dayKey] === 'fechado';
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                              <span style={{ width: 120, fontSize: 13, fontWeight: 600 }}>{label}</span>
                              <button
                                type="button"
                                onClick={() => setCompanyForm(p => ({ ...p, [dayKey]: isClosed ? 'aberto' : 'fechado' }))}
                                style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: isClosed ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: isClosed ? '#ef4444' : '#10b981' }}
                              >{isClosed ? 'Fechado' : 'Aberto'}</button>
                              {!isClosed && (
                                <>
                                  <input type="time" className="input-field" style={{ width: 110 }} value={companyForm[openKey] || '08:00'} onChange={e => setCompanyForm(p => ({ ...p, [openKey]: e.target.value }))} />
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>até</span>
                                  <input type="time" className="input-field" style={{ width: 110 }} value={companyForm[closeKey] || '22:00'} onChange={e => setCompanyForm(p => ({ ...p, [closeKey]: e.target.value }))} />
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-muted/30 border-t border-border flex items-center gap-3">
                    <button 
                      className="btn btn-secondary flex-1"
                      onClick={() => setIsCompanyModalOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="btn btn-primary flex-1"
                      onClick={() => {
                        if (!companyForm.name) {
                          toast.error('Nome é obrigatório');
                          return;
                        }
                        if (editingCompany) {
                          updateCompany(editingCompany.id, companyForm);
                          toast.success('Unidade atualizada!');
                        } else {
                          addCompany(companyForm);
                          toast.success('Nova unidade adicionada!');
                        }
                        setIsCompanyModalOpen(false);
                      }}
                    >
                      {editingCompany ? 'Salvar Alterações' : 'Criar Unidade'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== ABA FINANCEIRO ====== */}
        {activeTab === 'financial' && (
          <div className="space-y-8 animate-fade">
            <div className="border-b border-white/10 pb-6">
              <h3 className="text-2xl font-bold tracking-tight text-white">Financeiro e Taxas</h3>
              <p className="text-sm text-muted mt-1">Configure moeda e taxas de entrega.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Moeda Base</label>
                <select className="input-field" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                  <option value="R$">Real (R$)</option>
                  <option value="$">Dolar ($)</option>
                  <option value="€">Euro (€)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Taxa de Entrega Padrão</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">{form.currency}</span>
                  <input className="input-field pl-10" type="number" value={form.deliveryFee} onChange={e => setForm({...form, deliveryFee: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Raio de Entrega (km)</label>
                <input className="input-field" type="number" value={form.deliveryRadius} onChange={e => setForm({...form, deliveryRadius: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>
        )}

        {/* ====== ABA FIDELIDADE ====== */}
        {activeTab === 'loyalty' && (
          <div className="space-y-8 animate-fade">
            <div className="border-b border-white/10 pb-6">
              <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <Award className="text-primary-light" size={28} />
                Programa de Fidelidade
              </h3>
              <p className="text-sm text-muted mt-1">Defina como os clientes acumulam pontos e resgatam prêmios.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label className="form-label">Cálculo de Pontos (R$)</label>
                <p className="text-[10px] text-muted mb-2">A cada X reais gastos, o cliente ganha 1 ponto</p>
                <input className="input-field" type="number" value={form.pointsRate} onChange={e => setForm({...form, pointsRate: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                <label className="form-label">Resgate de Prêmio (Pontos)</label>
                <p className="text-[10px] text-muted mb-2">Quantos pontos para atingir o benefício</p>
                <input className="input-field" type="number" value={form.loyaltyRewardAt} onChange={e => setForm({...form, loyaltyRewardAt: parseInt(e.target.value)})} />
              </div>
            </div>
          </div>
        )}

        {/* ====== ABA HARDWARE ====== */}
        {activeTab === 'hardware' && (
          <div className="space-y-10 animate-fade">
            <div className="border-b border-white/10 pb-6">
              <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <Cpu className="text-accent" size={28} />
                Integração de Hardware
              </h3>
              <p className="text-sm text-muted mt-1">Conecte balanças, impressoras e outros periféricos via serial ou rede.</p>
            </div>
            {/* BALANÇA */}
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
                <div className="flex items-center gap-3">
                  <Scale size={20} color="var(--primary-light)" />
                  <div>
                    <h3 className="text-base font-bold">Balança Digital</h3>
                    <p className="text-xs text-muted">Toledo, Filizola, Urano — RS232/USB/TCP</p>
                  </div>
                </div>
                {/* Toggle ativar */}
                <button
                  onClick={() => setHwConfig(p => ({ ...p, scaleEnabled: !p.scaleEnabled }))}
                  style={{
                    width: 44, height: 24,
                    background: hwConfig.scaleEnabled ? 'var(--primary)' : 'var(--surface-3)',
                    borderRadius: 12, border: 'none', cursor: 'pointer',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, background: '#fff', borderRadius: '50%',
                    position: 'absolute', top: 3,
                    left: hwConfig.scaleEnabled ? 23 : 3,
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>

              {hwConfig.scaleEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="form-group">
                    <label className="form-label flex items-center gap-2"><Usb size={13} /> Protocolo</label>
                    <select className="input-field" value={hwConfig.scaleProtocol} onChange={e => setHwConfig(p => ({ ...p, scaleProtocol: e.target.value }))}>
                      <option value="simulator">🖥️ Simulador (teste no PC)</option>
                      <option value="serial">🔌 Serial RS232/USB (COM)</option>
                      <option value="tcp">🌐 TCP/IP (rede)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preço por Kg (R$/kg)</label>
                    <input
                      className="input-field"
                      type="number"
                      step="0.01"
                      value={hwConfig.acaiPricePerKg}
                      onChange={e => setHwConfig(p => ({ ...p, acaiPricePerKg: parseFloat(e.target.value) }))}
                    />
                  </div>

                  {hwConfig.scaleProtocol === 'serial' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Porta COM</label>
                        <select className="input-field" value={hwConfig.scalePort} onChange={e => setHwConfig(p => ({ ...p, scalePort: e.target.value }))}>
                          {['COM1','COM2','COM3','COM4','COM5','COM6','/dev/ttyS0','/dev/ttyUSB0'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Baud Rate</label>
                        <select className="input-field" value={hwConfig.scaleBaudRate} onChange={e => setHwConfig(p => ({ ...p, scaleBaudRate: e.target.value }))}>
                          {['1200','2400','4800','9600','19200','38400'].map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {hwConfig.scaleProtocol === 'tcp' && (
                    <>
                      <div className="form-group">
                        <label className="form-label flex items-center gap-2"><Wifi size={13} /> IP da Balança</label>
                        <input className="input-field" placeholder="192.168.1.100" value={hwConfig.scaleTcpHost} onChange={e => setHwConfig(p => ({ ...p, scaleTcpHost: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Porta TCP</label>
                        <input className="input-field" type="number" value={hwConfig.scaleTcpPort} onChange={e => setHwConfig(p => ({ ...p, scaleTcpPort: e.target.value }))} />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 flex items-center gap-3">
                    <button className="btn btn-secondary" onClick={testScale} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TestTube size={15} /> Testar Conexão
                    </button>
                    {scaleTestStatus === 'ok' && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><CheckCircle size={14} /> Conectado!</span>}
                    {scaleTestStatus === 'fail' && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><XCircle size={14} /> Falha na conexão</span>}
                    <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                      {hwConfig.scaleProtocol === 'simulator'
                        ? 'Use o Simulador no PDV para testar'
                        : 'Requer hardware e driver instalados'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* IMPRESSORA */}
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
                <div className="flex items-center gap-3">
                  <Printer size={20} color="var(--accent)" />
                  <div>
                    <h3 className="text-base font-bold">Impressora Térmica</h3>
                    <p className="text-xs text-muted">ESC/POS — Epson, Bematech, Daruma</p>
                  </div>
                </div>
                <button
                  onClick={() => setHwConfig(p => ({ ...p, printerEnabled: !p.printerEnabled }))}
                  style={{
                    width: 44, height: 24,
                    background: hwConfig.printerEnabled ? 'var(--primary)' : 'var(--surface-3)',
                    borderRadius: 12, border: 'none', cursor: 'pointer',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, background: '#fff', borderRadius: '50%',
                    position: 'absolute', top: 3,
                    left: hwConfig.printerEnabled ? 23 : 3,
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>

              {hwConfig.printerEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="form-group">
                    <label className="form-label">Modo de Impressão</label>
                    <select className="input-field" value={hwConfig.printerMode} onChange={e => setHwConfig(p => ({ ...p, printerMode: e.target.value }))}>
                      <option value="browser">🖥️ Navegador (window.print)</option>
                      <option value="tcp">🌐 TCP/IP direto (ESC/POS)</option>
                    </select>
                    <p className="text-[10px] text-muted mt-1">
                      {hwConfig.printerMode === 'browser'
                        ? 'Abre janela de impressão do sistema operacional'
                        : 'Envia comandos ESC/POS direto via TCP (backend Node.js necessário)'}
                    </p>
                  </div>

                  {hwConfig.printerMode === 'tcp' && (
                    <>
                      <div className="form-group">
                        <label className="form-label flex items-center gap-2"><Wifi size={13} /> IP da Impressora</label>
                        <input className="input-field" placeholder="192.168.1.200" value={hwConfig.printerTcpHost} onChange={e => setHwConfig(p => ({ ...p, printerTcpHost: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Porta TCP</label>
                        <input className="input-field" type="number" value={hwConfig.printerTcpPort} onChange={e => setHwConfig(p => ({ ...p, printerTcpPort: e.target.value }))} />
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2 flex items-center gap-3">
                    <button className="btn btn-secondary" onClick={testPrinter} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Printer size={15} /> Imprimir Teste
                    </button>
                    {printerTestStatus === 'ok' && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><CheckCircle size={14} /> Impressão enviada!</span>}
                    {printerTestStatus === 'fail' && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><XCircle size={14} /> Requer backend</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Info de integração real */}
            <div style={{
              padding: '14px 16px',
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 'var(--radius)',
              fontSize: 13,
            }}>
              <div style={{ fontWeight: 700, color: '#3b82f6', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Cpu size={14} /> Integração com Hardware Real
              </div>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Para integração com hardware físico (balança RS232, impressora TCP), instale o agente backend Node.js.<br />
                <strong>npm install serialport escpos</strong> — e rode o servidor local na porta 3001.
              </p>
            </div>
          </div>
        )}

        {/* ====== ABA IMPRESSÃO ====== */}
        {activeTab === 'print' && (
          <div className="space-y-10 animate-fade">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                  <Printer className="text-primary-light" size={28} />
                  Configuração de Impressão
                </h3>
                <p className="text-sm text-muted mt-1">Personalize o cupom fiscal, adicione logotipos e mensagens.</p>
              </div>
              <button
                className="btn btn-secondary shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                onClick={testPrinter}
                title="Abre uma janela popup com o cupom de teste para impressão"
              >
                <Printer size={16} /> Imprimir Teste
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Esquerda: Configurações */}
              <div className="space-y-6">

                {/* Logotipo */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Image size={14} color="var(--accent)" /> Logotipo</h4>
                  <div className="flex items-center gap-4">
                    {form.printLogo ? (
                      <img src={form.printLogo} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', padding: 4 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Image size={24} color="var(--text-muted)" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="btn btn-secondary btn-sm cursor-pointer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Image size={13} /> Escolher Imagem
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => setForm(p => ({ ...p, printLogo: ev.target.result }));
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                      {form.printLogo && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setForm(p => ({ ...p, printLogo: null }))}>
                          <Trash2 size={12} /> Remover
                        </button>
                      )}
                      <p className="text-xs text-muted">PNG ou JPG recomendado. Centralizado no cupom.</p>
                    </div>
                  </div>
                </div>

                {/* Textos do cupom */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><AlignLeft size={14} color="var(--primary-light)" /> Textos do Cupom</h4>
                  <div className="space-y-3">
                    <div className="form-group">
                      <label className="form-label">Cabeçalho (linha de boas-vindas)</label>
                      <input className="input-field" placeholder="Ex: Bem-vindo ao Açaí ERP SaaS!" value={form.printHeader || ''} onChange={e => setForm(p => ({ ...p, printHeader: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mensagem de Rodapé</label>
                      <textarea className="input-field" rows={2} placeholder="Ex: Obrigado pela preferência! Volte sempre!" value={form.printFooter || ''} onChange={e => setForm(p => ({ ...p, printFooter: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mensagem de Fidelidade</label>
                      <input className="input-field" placeholder="Ex: Acumule pontos e ganhe prêmios!" value={form.printLoyaltyMsg || ''} onChange={e => setForm(p => ({ ...p, printLoyaltyMsg: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Dados fiscais no cupom */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><FileText size={14} color="var(--accent)" /> Dados no Cupom</h4>
                  <div className="space-y-2">
                    {[
                      { key: 'printShowCnpj', label: 'Exibir CNPJ' },
                      { key: 'printShowAddress', label: 'Exibir Endereço' },
                      { key: 'printShowOrderNumber', label: 'Exibir Número do Pedido' },
                      { key: 'printShowTime', label: 'Exibir Horário' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-surface-2">
                        <span className="text-sm">{label}</span>
                        <button
                          onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                          style={{ width: 40, height: 22, background: form[key] ? 'var(--primary)' : 'var(--surface-3)', borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                        >
                          <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: form[key] ? 21 : 3, transition: 'left 0.2s' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layout */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><Type size={14} color="var(--primary-light)" /> Layout</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">Largura do Cupom</label>
                      <select className="input-field" value={form.printCupomWidth || '80mm'} onChange={e => setForm(p => ({ ...p, printCupomWidth: e.target.value }))}>
                        <option value="58mm">58mm (estreito)</option>
                        <option value="80mm">80mm (padrão)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Separador de Itens</label>
                      <select className="input-field" value={form.printSeparator || 'linha'} onChange={e => setForm(p => ({ ...p, printSeparator: e.target.value }))}>
                        <option value="linha">Linha (-------)</option>
                        <option value="espaco">Espaço</option>
                        <option value="nenhum">Nenhum</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fonte</label>
                      <select className="input-field" value={form.printFont || 'normal'} onChange={e => setForm(p => ({ ...p, printFont: e.target.value }))}>
                        <option value="normal">Normal</option>
                        <option value="compacta">Compacta</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Intensidade (Negrito)</label>
                      <select className="input-field" value={form.printFontWeight || 'normal'} onChange={e => setForm(p => ({ ...p, printFontWeight: e.target.value }))}>
                        <option value="normal">Normal</option>
                        <option value="bold">Negrito (Forte)</option>
                        <option value="900">Black (Muito Forte)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pix QR */}
                <div>
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><QrCode size={14} color="var(--accent)" /> QR Code Pix</h4>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 mb-3">
                    <span className="text-sm">Exibir QR Code Pix no rodapé</span>
                    <button
                      onClick={() => setForm(p => ({ ...p, printShowQr: !p.printShowQr }))}
                      style={{ width: 40, height: 22, background: form.printShowQr ? 'var(--primary)' : 'var(--surface-3)', borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                    >
                      <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: form.printShowQr ? 21 : 3, transition: 'left 0.2s' }} />
                    </button>
                  </div>
                  {form.printShowQr && (
                    <div className="form-group">
                      <label className="form-label">Chave Pix</label>
                      <input className="input-field" placeholder="CPF, CNPJ, e-mail ou telefone" value={form.printPixKey || ''} onChange={e => setForm(p => ({ ...p, printPixKey: e.target.value }))} />
                    </div>
                  )}
                </div>

                {/* ── Impressora de Cozinha ── */}
                <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  <h4 className="text-sm font-bold mb-1 flex items-center gap-2">
                    <Printer size={14} color="#f59e0b" /> Impressora de Produção (Cozinha)
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>COZINHA</span>
                  </h4>
                  <p className="text-xs text-muted mb-4">Impressora separada para tickets de produção enviados à cozinha.</p>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 mb-3">
                    <span className="text-sm font-medium">Ativar impressora de cozinha</span>
                    <button
                      onClick={() => setHwConfig(p => ({ ...p, kitchenPrinterEnabled: !p.kitchenPrinterEnabled }))}
                      style={{ width: 40, height: 22, background: hwConfig.kitchenPrinterEnabled ? '#f59e0b' : 'var(--surface-3)', borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}
                    >
                      <div style={{ width: 16, height: 16, background: '#fff', borderRadius: '50%', position: 'absolute', top: 3, left: hwConfig.kitchenPrinterEnabled ? 21 : 3, transition: 'left 0.2s' }} />
                    </button>
                  </div>

                  {hwConfig.kitchenPrinterEnabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Modo de Impressão</label>
                        <select className="input-field" value={hwConfig.kitchenPrinterMode} onChange={e => setHwConfig(p => ({ ...p, kitchenPrinterMode: e.target.value }))}>
                          <option value="browser">Browser (popup)</option>
                          <option value="tcp">TCP/IP (rede local)</option>
                        </select>
                      </div>

                      {hwConfig.kitchenPrinterMode === 'tcp' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                          <div className="form-group">
                            <label className="form-label">Host / IP</label>
                            <input className="input-field" value={hwConfig.kitchenPrinterTcpHost} onChange={e => setHwConfig(p => ({ ...p, kitchenPrinterTcpHost: e.target.value }))} placeholder="192.168.1.201" />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Porta</label>
                            <input className="input-field" value={hwConfig.kitchenPrinterTcpPort} onChange={e => setHwConfig(p => ({ ...p, kitchenPrinterTcpPort: e.target.value }))} placeholder="9100" style={{ width: 90 }} />
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">Largura do Papel</label>
                        <select className="input-field" value={hwConfig.kitchenPrinterWidth} onChange={e => setHwConfig(p => ({ ...p, kitchenPrinterWidth: e.target.value }))}>
                          <option value="58mm">58mm (estreito)</option>
                          <option value="80mm">80mm (padrão)</option>
                        </select>
                      </div>

                      {/* Estilo do Ticket de Cozinha */}
                      <div style={{ padding: '12px', background: 'var(--surface-3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <p className="text-xs font-bold text-muted mb-3">Estilo do Ticket</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 10 }}>Fonte</label>
                            <select className="input-field" style={{ fontSize: 11 }} value={form.kitchenFont || 'monospace'} onChange={e => setForm(p => ({ ...p, kitchenFont: e.target.value }))}>
                              <option value="monospace">Mono</option>
                              <option value="Arial, sans-serif">Arial</option>
                              <option value="'Courier New', monospace">Courier</option>
                              <option value="Impact, sans-serif">Impact</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 10 }}>Tamanho</label>
                            <select className="input-field" style={{ fontSize: 11 }} value={form.kitchenFontSize || '13'} onChange={e => setForm(p => ({ ...p, kitchenFontSize: e.target.value }))}>
                              {['10','11','12','13','14','16','18'].map(s => <option key={s} value={s}>{s}px</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: 10 }}>Intensidade</label>
                            <select className="input-field" style={{ fontSize: 11 }} value={form.kitchenFontWeight || 'normal'} onChange={e => setForm(p => ({ ...p, kitchenFontWeight: e.target.value }))}>
                              <option value="normal">Normal</option>
                              <option value="bold">Negrito</option>
                              <option value="900">Black</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button className="btn btn-secondary" style={{ borderColor: '#f59e0b', color: '#f59e0b' }} onClick={testKitchenPrinter}>
                        <Printer size={14} /> Testar Impressão de Cozinha
                        {kitchenPrinterTestStatus === 'ok' && <span style={{ marginLeft: 6, color: 'var(--success)', fontSize: 11 }}>✓ OK</span>}
                      </button>

                      {/* Previa do ticket de cozinha */}
                      <div>
                        <p className="text-xs font-bold text-muted mb-2">Previa - Ticket de Cozinha</p>
                        {(() => {
                          const fsNum = parseInt(form.kitchenFontSize || '13', 10);
                          return (
                            <div style={{
                              background: form.kitchenBgColor || '#fff',
                              color: form.kitchenTextColor || '#000',
                              fontFamily: form.kitchenFont || 'monospace',
                              fontSize: String(fsNum) + 'px',
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              maxWidth: hwConfig.kitchenPrinterWidth === '58mm' ? 220 : 300,
                              padding: '12px',
                              lineHeight: 1.7,
                            }}>
                              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: String(fsNum + 4) + 'px', color: form.kitchenNumberColor || '#e53e3e', letterSpacing: 2 }}>PEDIDO #0042</div>
                              <div style={{ textAlign: 'center', fontSize: String(fsNum - 1) + 'px', fontWeight: 'bold', marginBottom: 8 }}>{new Date().toLocaleTimeString('pt-BR')}</div>
                              <div style={{ borderTop: '1px dashed currentColor', margin: '6px 0' }} />
                              <div>1x <strong>Acai 500ml</strong></div>
                              <div style={{ paddingLeft: 12, fontWeight: 'bold' }}>+ Granola</div>
                              <div style={{ paddingLeft: 12, fontWeight: 'bold' }}>+ Morango</div>
                              <div>1x <strong>Acai 300ml</strong></div>
                              <div style={{ borderTop: '1px dashed currentColor', margin: '6px 0' }} />
                              <div style={{ textAlign: 'center', fontSize: String(fsNum - 2) + 'px', fontWeight: 'bold' }}>BALCAO</div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Direita: Prévia ao vivo */}
              <div>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-2"><FileText size={14} /> Prévia do Cupom</h4>
                <div style={{
                  background: '#fff', color: '#111', borderRadius: 8,
                  border: '1px solid var(--border)',
                  maxWidth: form.printCupomWidth === '58mm' ? 220 : 300,
                  margin: '0 auto',
                  padding: '16px 12px',
                  fontFamily: 'monospace',
                  fontSize: form.printFont === 'compacta' ? 10 : 11,
                  lineHeight: 1.6,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                }}>
                  {/* Logo */}
                  {form.printLogo && (
                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <img src={form.printLogo} alt="Logo" style={{ maxWidth: 80, maxHeight: 48, objectFit: 'contain' }} />
                    </div>
                  )}
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: form.printFont === 'compacta' ? 12 : 14, marginBottom: 2 }}>{form.storeName || 'Nome da Loja'}</div>
                  {form.printShowCnpj && form.storeCnpj && <div style={{ textAlign: 'center', fontSize: 9 }}>CNPJ: {form.storeCnpj}</div>}
                  {form.printShowAddress && form.storeAddress && <div style={{ textAlign: 'center', fontSize: 9 }}>{form.storeAddress}</div>}
                  {form.storePhone && <div style={{ textAlign: 'center', fontSize: 9 }}>{form.storePhone}</div>}
                  {form.printHeader && <div style={{ textAlign: 'center', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>{form.printHeader}</div>}

                  <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

                  {form.printShowOrderNumber && <div style={{ fontSize: 9 }}>PEDIDO #0042</div>}
                  {form.printShowTime && <div style={{ fontSize: 9 }}>{new Date().toLocaleString('pt-BR')}</div>}
                  <div style={{ fontSize: 9 }}>CLIENTE: Balcão</div>

                  <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>1x Açaí 500ml</span><span>R$ 22,90</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>1x Granola</span><span>R$ 2,00</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>1x Morango</span><span>R$ 3,00</span></div>

                  {form.printSeparator === 'linha' && <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />}
                  {form.printSeparator === 'espaco' && <div style={{ marginTop: 8 }} />}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12 }}><span>TOTAL</span><span>R$ 27,90</span></div>
                  <div style={{ fontSize: 9, marginTop: 2 }}>PAGAMENTO: Pix</div>

                  <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

                  {form.printLoyaltyMsg && <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', marginBottom: 4 }}>{form.printLoyaltyMsg}</div>}
                  {form.printShowQr && form.printPixKey && (
                    <div style={{ textAlign: 'center', marginTop: 6 }}>
                      {/* Simulated QR Code grid */}
                      <div style={{ display: 'inline-grid', gridTemplateColumns: 'repeat(9,4px)', gap: 1, padding: 4, border: '2px solid #111', borderRadius: 2, background: '#fff', margin: '0 auto' }}>
                        {Array.from({ length: 81 }, (_, i) => (
                          <div key={i} style={{ width: 4, height: 4, background: [0,1,2,9,10,11,18,19,20,63,64,65,72,73,74,27,35,36,44,45,53,7,8,16,17,25,56,57,65].includes(i) ? '#111' : '#fff' }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 8, marginTop: 3 }}>Pix: {form.printPixKey}</div>
                    </div>
                  )}
                  {form.printFooter && <div style={{ textAlign: 'center', fontSize: 9, fontStyle: 'italic', marginTop: 6 }}>{form.printFooter}</div>}
                </div>
                <p className="text-xs text-muted text-center mt-3">Prévia em tempo real do cupom</p>
              </div>
            </div>
          </div>
        )}

        {/* ====== ABA PAGAMENTOS ====== */}
        {activeTab === 'payments' && (
          <div className="space-y-8 animate-fade">
            <div className="border-b border-border pb-6">
              <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <CreditCard className="text-primary-light" size={28} />
                Meios de Pagamento
              </h3>
              <p className="text-sm text-muted mt-1">Configure integrações com Pix, Mercado Pago e TEF.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Default Gateway */}
              <div className="glass-card p-5 md:col-span-2 border-primary/30 border">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={18} className="text-primary" />
                  <h4 className="font-bold text-white">Gateway de Pagamento Padrão</h4>
                </div>
                <p className="text-xs text-muted mb-4">Selecione qual provedor será utilizado por padrão ao enviar vendas para a maquininha no PDV.</p>
                <div className="form-group">
                  <select 
                    className="input-field" 
                    value={paymentConfig.defaultTerminalProvider || 'mercadopago'} 
                    onChange={e => setPaymentConfig({...paymentConfig, defaultTerminalProvider: e.target.value})}
                  >
                    <option value="mercadopago">Mercado Pago</option>
                    <option value="stone">Stone</option>
                    <option value="pagseguro">PagSeguro</option>
                  </select>
                </div>
              </div>
              {/* PIX */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-accent" />
                    <h4 className="font-bold text-white">Chave PIX Manual</h4>
                  </div>
                  <div style={{ transform: 'scale(1.2)' }}>
                    <input type="checkbox" checked={paymentConfig.pixEnabled} onChange={e => setPaymentConfig({...paymentConfig, pixEnabled: e.target.checked})} />
                  </div>
                </div>
                {paymentConfig.pixEnabled && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Tipo de Chave</label>
                      <select className="input-field" value={paymentConfig.pixKeyType} onChange={e => setPaymentConfig({...paymentConfig, pixKeyType: e.target.value})}>
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="email">E-mail</option>
                        <option value="telefone">Telefone</option>
                        <option value="aleatoria">Chave Aleatória</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chave PIX</label>
                      <input className="input-field" placeholder="Insira sua chave" value={paymentConfig.pixKey} onChange={e => setPaymentConfig({...paymentConfig, pixKey: e.target.value})} />
                    </div>
                  </div>
                )}
              </div>

              {/* Mercado Pago */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Link2 size={18} className="text-info" />
                    <h4 className="font-bold text-white">Mercado Pago</h4>
                  </div>
                  <div style={{ transform: 'scale(1.2)' }}>
                    <input type="checkbox" checked={paymentConfig.mercadoPagoEnabled} onChange={e => setPaymentConfig({...paymentConfig, mercadoPagoEnabled: e.target.checked})} />
                  </div>
                </div>
                {paymentConfig.mercadoPagoEnabled && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Access Token</label>
                      <input className="input-field" type="password" placeholder="APP_USR-..." value={paymentConfig.mercadoPagoToken} onChange={e => setPaymentConfig({...paymentConfig, mercadoPagoToken: e.target.value})} />
                      <span className="text-[10px] text-muted">Necessário para gerar cobrança.</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ID da Maquininha (Device ID)</label>
                      <input className="input-field" placeholder="ex: PAX_A920_..." value={paymentConfig.mercadoPagoDeviceId} onChange={e => setPaymentConfig({...paymentConfig, mercadoPagoDeviceId: e.target.value})} />
                      <span className="text-[10px] text-muted">Identificador único da sua maquininha Point.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Stone */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-[#00B259]" />
                    <h4 className="font-bold text-white">Stone</h4>
                  </div>
                  <div style={{ transform: 'scale(1.2)' }}>
                    <input type="checkbox" checked={paymentConfig.stoneEnabled || false} onChange={e => setPaymentConfig({...paymentConfig, stoneEnabled: e.target.checked})} />
                  </div>
                </div>
                {paymentConfig.stoneEnabled && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Stone Code / API Key</label>
                      <input className="input-field" type="password" placeholder="Insira o Stone Code..." value={paymentConfig.stoneCode || ''} onChange={e => setPaymentConfig({...paymentConfig, stoneCode: e.target.value})} />
                      <span className="text-[10px] text-muted">Necessário para integração com terminais Stone.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* PagSeguro */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-[#FFC700]" />
                    <h4 className="font-bold text-white">PagSeguro</h4>
                  </div>
                  <div style={{ transform: 'scale(1.2)' }}>
                    <input type="checkbox" checked={paymentConfig.pagSeguroEnabled || false} onChange={e => setPaymentConfig({...paymentConfig, pagSeguroEnabled: e.target.checked})} />
                  </div>
                </div>
                {paymentConfig.pagSeguroEnabled && (
                  <div className="space-y-4">
                    <div className="form-group">
                      <label className="form-label">Token de Autenticação</label>
                      <input className="input-field" type="password" placeholder="Insira o Token PagSeguro..." value={paymentConfig.pagSeguroToken || ''} onChange={e => setPaymentConfig({...paymentConfig, pagSeguroToken: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ID do Dispositivo (PlugPag)</label>
                      <input className="input-field" placeholder="ex: 123456" value={paymentConfig.pagSeguroDeviceId || ''} onChange={e => setPaymentConfig({...paymentConfig, pagSeguroDeviceId: e.target.value})} />
                    </div>
                  </div>
                )}
              </div>

              {/* TEF */}
              <div className="glass-card p-5 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-warning" />
                    <h4 className="font-bold text-white">Integração TEF (Pinpad)</h4>
                  </div>
                  <div style={{ transform: 'scale(1.2)' }}>
                    <input type="checkbox" checked={paymentConfig.tefEnabled} onChange={e => setPaymentConfig({...paymentConfig, tefEnabled: e.target.checked})} />
                  </div>
                </div>
                {paymentConfig.tefEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">IP do Cliente TEF</label>
                      <input className="input-field" placeholder="127.0.0.1" value={paymentConfig.tefIp} onChange={e => setPaymentConfig({...paymentConfig, tefIp: e.target.value})} />
                    </div>
                    <div className="form-group flex items-end">
                      <span className="text-xs text-muted mb-3">Requer SiTef ou PayGo rodando na rede local.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <button className="btn btn-secondary" onClick={testPayment}>
                <RefreshCw size={14} className={paymentTestStatus === null ? '' : 'text-success'} /> Testar Integrações
              </button>
              {paymentTestStatus === 'ok' && <span className="text-success text-sm font-bold flex items-center gap-1"><CheckCircle size={16}/> Configurações Válidas</span>}
              {paymentTestStatus === 'fail' && <span className="text-danger text-sm font-bold flex items-center gap-1"><XCircle size={16}/> Falha na Validação</span>}
            </div>
          </div>
        )}

        {/* ====== ABA EXTENSÕES ====== */}
        {activeTab === 'extensions' && (
          <div className="space-y-8 animate-fade">
            <div className="border-b border-white/10 pb-6">
              <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <LayoutGrid className="text-primary-light" size={28} />
                Marketplace de Extensões
              </h3>
              <p className="text-sm text-muted mt-1">Potencialize seu ERP ativando módulos especializados conforme sua necessidade.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { id: 'hub', label: 'Marketplace Hub', desc: 'Sincronização omnichannel com iFood, Mercado Livre, Shopee e Amazon.', icon: Globe, color: 'var(--primary-light)' },
                { id: 'fiscal', label: 'Emissor Fiscal PRO', desc: 'Emissão ilimitada de NF-e e NFC-e com contingência SCAN e monitoramento SEFAZ.', icon: ShieldCheck, color: '#10B981' },
                { id: 'crm', label: 'CRM & Propostas', desc: 'Funil de vendas, orçamentos profissionais e segmentação inteligente de clientes.', icon: Users, color: '#F59E0B' },
                { id: 'logistics', label: 'Expedição & Logística', desc: 'Picking, Packing, etiquetas inteligentes e rastreio de transportadoras em tempo real.', icon: ShoppingBag, color: '#3B82F6' },
                { id: 'reports', label: 'B.I. Avançado & DRE', desc: 'Dashboards gerenciais completos, análise de DRE, CMV e fluxo de caixa projetado.', icon: TrendingUp, color: '#10B981' },
                { id: 'tef', label: 'Integração TEF Pro', desc: 'Conecte seu Pinpad e máquina de cartão para conciliação bancária automática.', icon: CreditCard, color: '#6366F1' },
                { id: 'loyalty', label: 'Clube de Fidelidade', desc: 'Cashback dinâmico, cupons inteligentes e campanhas de retenção por WhatsApp.', icon: Award, color: '#EC4899' },
                { id: 'ai', label: 'Açaí A.I. Engine', desc: 'Previsão de demanda, sugestão de preços e auditoria de perdas por IA.', icon: Zap, color: '#FCD34D' },
              ].map(ext => (
                <div key={ext.id} className="glass-card flex flex-col justify-between group hover:border-primary/50 transition-all cursor-pointer">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ext.color, border: '1px solid var(--border)' }}>
                        <ext.icon size={24} />
                      </div>
                      {(() => {
                        const isActive = activeExtensions.includes(ext.id);
                        return (isActive ? (
                          <span style={{ 
                            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                            background: 'var(--success-bg)',
                            color: 'var(--success)',
                          }}>
                            ATIVO
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10,
                            background: 'var(--surface-3)',
                            color: 'var(--text-muted)',
                          }}>
                            DISPONÍVEL
                          </span>
                        ));
                      })()}
                    </div>
                    <h4 className="font-bold text-lg mb-2">{ext.label}</h4>
                    <p className="text-xs text-muted leading-relaxed">{ext.desc}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Módulo SaaS</span>
                    {(() => {
                      const isActive = activeExtensions.includes(ext.id);
                      return (
                        <button 
                          className={`btn btn-xs ${!isActive ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExtension(ext.id);
                            toast.success(`${!isActive ? 'Instalado' : 'Desinstale'} ${ext.label} com sucesso!`);
                          }}
                        >
                          {!isActive ? 'Instalar' : 'Configurar'}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== ABA ASSINATURA ====== */}
        {activeTab === 'subscription' && (
          <div className="space-y-8 animate-fade text-center py-10">
            <div className="w-20 h-20 bg-primary-glow rounded-full flex items-center justify-center mx-auto mb-6">
              <Crown className="text-primary-light" size={40} />
            </div>
            <h3 className="text-2xl font-black">Gerencie sua Assinatura</h3>
            <p className="text-muted max-w-md mx-auto">
              Você está atualmente no plano <span className="text-primary-light font-bold">{(settings?.planId || 'pro').toUpperCase()}</span>. 
              Clique abaixo para ver detalhes de faturamento, trocar de plano ou atualizar seus dados.
            </p>
            <button 
              className="btn btn-primary btn-lg mt-4"
              onClick={() => window.location.href = '/subscription'}
            >
              Ver Detalhes da Assinatura
            </button>
          </div>
        )}

        {/* ====== ABA SISTEMA ====== */}
        {activeTab === 'system' && (
          <div className="space-y-8 animate-fade">
            <div className="border-b border-white/10 pb-6">
              <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                <Laptop className="text-accent" size={28} />
                Preferências do Sistema
              </h3>
              <p className="text-sm text-muted mt-1">Configurações globais, notificações e manutenção.</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-radius border border-border">
                <div className="flex items-center gap-3">
                  <Shield className="text-primary-light" size={20} />
                  <div>
                    <div className="text-sm font-bold">Autenticação em duas etapas</div>
                    <div className="text-xs text-muted">Aumente a segurança da sua conta</div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm">Ativar</button>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-radius border border-border">
                <div className="flex items-center gap-3">
                  <Bell className="text-accent" size={20} />
                  <div>
                    <div className="text-sm font-bold">Notificações Sonoras</div>
                    <div className="text-xs text-muted">Alertas para novos pedidos no PDV</div>
                  </div>
                </div>
                <div style={{ width: 44, height: 24, background: 'var(--primary)', borderRadius: 12, position: 'relative' }}>
                  <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', right: 3, top: 3 }} />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-surface-2 rounded-radius border border-border">
                <div className="flex items-center gap-3 text-danger">
                  <Trash2 size={20} />
                  <div>
                    <div className="text-sm font-bold">Resetar para Dados de Demonstração</div>
                    <div className="text-xs text-danger opacity-70">Restaura o sistema para o estado inicial de testes (SaaS Engine)</div>
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    if (confirm('Tem certeza? Isso apagará todos os seus dados e restaurará os dados de demonstração iniciais.')) {
                      resetToDemoData();
                      toast.success('Ambiente resetado. Recarregando...');
                      setTimeout(() => window.location.reload(), 1500);
                    }
                  }}
                >
                  Resetar Ambiente
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-12 pt-6 border-t border-white/10">
          <button className="btn btn-primary btn-lg px-12 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1 font-bold tracking-wide" onClick={handleSave}>
            <Save size={20} /> Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
