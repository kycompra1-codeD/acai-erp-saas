import React, { useState, useEffect } from 'react';
import { 
  User, Building2, MapPin, Shield, CreditCard, Upload, Save, 
  AlertCircle, Check, Zap, Crown, ShieldCheck, ArrowRight,
  TrendingUp, Globe, Truck, Users as UsersIcon, FileText, 
  Loader2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import CheckoutModal from '../components/CheckoutModal';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api';

function authFetch(path) {
  const token = localStorage.getItem('zullya_access_token');
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
}

function PlanoIcon({ nome, size = 28 }) {
  if (!nome) return <Zap size={size} />;
  const n = nome.toLowerCase();
  if (n.includes('enterprise') || n.includes('franquia')) return <ShieldCheck size={size} />;
  if (n.includes('pro') || n.includes('business')) return <Crown size={size} />;
  return <Zap size={size} />;
}

const STATUS_LABEL = {
  ativo: { label: 'Ativo', color: '#10b981' },
  trial: { label: 'Em trial', color: '#f59e0b' },
  expirado: { label: 'Expirado', color: '#ef4444' },
  suspenso: { label: 'Suspenso', color: '#ef4444' },
  cancelado: { label: 'Cancelado', color: '#6b7280' },
  inadimplente: { label: 'Inadimplente', color: '#ef4444' },
};

export default function MyAccount() {
  const { empresa, user } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');
  const [isLoading, setIsLoading] = useState(false);

  // Estados dos Planos e Assinatura (Unificados do Subscription.jsx)
  const [planos, setPlanos] = useState([]);
  const [assinatura, setAssinatura] = useState(null);
  const [faturas, setFaturas] = useState([]);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Estados dos formulários de dados cadastrais
  const [perfil, setPerfil] = useState({
    nome: user?.name || 'Administrador',
    email: user?.email || '',
    celular: '(11) 99999-9999',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  const [dadosEmpresa, setDadosEmpresa] = useState({
    razaoSocial: empresa?.razao_social || 'Zullya Sistemas Ltda',
    nomeFantasia: empresa?.nome_fantasia || 'Zullya ERP',
    cnpj: empresa?.cnpj || '00.000.000/0001-00',
    ie: empresa?.inscricao_estadual || 'Isento',
    telefone: '(11) 3000-0000',
    emailComercial: 'contato@zullya.com.br',
    regimeTributario: 'Simples Nacional'
  });

  const [endereco, setEndereco] = useState({
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    numero: '1',
    complemento: 'Sala 101',
    bairro: 'Sé',
    cidade: 'São Paulo',
    estado: 'SP'
  });

  // Atualizar dados iniciais caso o usuário/empresa logue com sucesso
  useEffect(() => {
    if (user) {
      setPerfil(p => ({ ...p, nome: user.name, email: user.email }));
    }
    if (empresa) {
      setDadosEmpresa(e => ({
        ...e,
        razaoSocial: empresa.razao_social || e.razaoSocial,
        nomeFantasia: empresa.nome_fantasia || e.nomeFantasia,
        cnpj: empresa.cnpj || e.cnpj,
      }));
    }
  }, [user, empresa]);

  // Verificar retorno do Mercado Pago / Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pagamento = params.get('pagamento');
    if (pagamento === 'aprovado') {
      toast.success('Pagamento aprovado! Sua conta foi ativada.');
      window.history.replaceState({}, '', '/my-account');
      setActiveTab('assinatura');
    } else if (pagamento === 'falhou') {
      toast.error('Pagamento não aprovado. Tente novamente.');
      window.history.replaceState({}, '', '/my-account');
      setActiveTab('assinatura');
    } else if (pagamento === 'pendente') {
      toast('Pagamento em processamento. Você receberá uma confirmação em breve.', { icon: '⏳' });
      window.history.replaceState({}, '', '/my-account');
      setActiveTab('assinatura');
    }
  }, []);

  // Carregar planos, assinatura e faturas da API real
  useEffect(() => {
    const carregar = async () => {
      setLoadingSubscription(true);
      try {
        const [planosRes, assinaturaRes, faturasRes] = await Promise.all([
          fetch(`${API}/pagamentos/planos`).then(r => r.json()).catch(() => ({ sucesso: false })),
          authFetch('/pagamentos/minha-assinatura').catch(() => ({ sucesso: false })),
          authFetch('/pagamentos/faturas').catch(() => ({ sucesso: false })),
        ]);
        
        if (planosRes.sucesso) setPlanos(planosRes.dados);
        if (assinaturaRes.sucesso) setAssinatura(assinaturaRes.dados);
        if (faturasRes.sucesso) setFaturas(faturasRes.dados);
      } catch (err) {
        console.error('Erro ao carregar dados de faturamento/assinatura:', err);
      } finally {
        setLoadingSubscription(false);
      }
    };
    carregar();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Dados atualizados com sucesso!');
    }, 1000);
  };

  const handleUpgrade = (plan) => {
    if (assinatura?.plano_nome === plan.nome && tenantStatus === 'ativo') {
      toast('Você já está neste plano!', { icon: 'ℹ️' });
      return;
    }
    setSelectedPlan(plan);
  };

  const handleCheckoutSuccess = () => {
    setSelectedPlan(null);
    toast.success('Assinatura ativada com sucesso! Recarregando...');
    setTimeout(() => window.location.reload(), 2000);
  };

  const tenantStatus = empresa?.status || user?.empresa?.status || 'trial';
  const tenantStatusInfo = STATUS_LABEL[tenantStatus] || STATUS_LABEL.trial;
  const trialExpira = empresa?.trial_expira_em || assinatura?.trial_expira_em;
  const diasRestantes = trialExpira
    ? Math.max(0, Math.ceil((new Date(trialExpira) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const tabs = [
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'certificado', label: 'Certificado Digital', icon: Shield },
    { id: 'assinatura', label: 'Assinatura e Planos', icon: CreditCard },
  ];

  return (
    <div className="page-container pb-12">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Minha Conta</h1>
          <p className="page-subtitle">Gerencie suas informações pessoais, dados corporativos e planos do sistema.</p>
        </div>
        {activeTab !== 'assinatura' && (
          <button className="btn btn-primary" onClick={handleSave} disabled={isLoading}>
            <Save size={18} />
            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Sidebar de Tabs */}
        <div className="card" style={{ padding: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  background: activeTab === tab.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da Tab */}
        <div className="card" style={{ padding: '32px' }}>
          
          {activeTab === 'perfil' && (
            <div className="animation-fade-in">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="var(--primary)" /> Dados do Perfil
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div className="form-group">
                  <label>Nome Completo</label>
                  <input type="text" className="input" value={perfil.nome} onChange={e => setPerfil({...perfil, nome: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>E-mail de Acesso</label>
                  <input type="email" className="input" value={perfil.email} onChange={e => setPerfil({...perfil, email: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Celular / WhatsApp</label>
                  <input type="text" className="input" value={perfil.celular} onChange={e => setPerfil({...perfil, celular: e.target.value})} />
                </div>
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <Shield size={20} color="var(--primary)" /> Alterar Senha
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Senha Atual</label>
                  <input type="password" className="input" placeholder="Digite sua senha atual" value={perfil.senhaAtual} onChange={e => setPerfil({...perfil, senhaAtual: e.target.value})} style={{ maxWidth: '400px' }} />
                </div>
                <div className="form-group">
                  <label>Nova Senha</label>
                  <input type="password" className="input" placeholder="Digite a nova senha" value={perfil.novaSenha} onChange={e => setPerfil({...perfil, novaSenha: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Confirmar Nova Senha</label>
                  <input type="password" className="input" placeholder="Confirme a nova senha" value={perfil.confirmarSenha} onChange={e => setPerfil({...perfil, confirmarSenha: e.target.value})} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'empresa' && (
            <div className="animation-fade-in">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="var(--primary)" /> Dados da Empresa
              </h2>

              <div style={{ display: 'flex', gap: '32px', marginBottom: '32px' }}>
                {/* Upload de Logo */}
                <div style={{ flexShrink: 0 }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Logotipo</label>
                  <div style={{ 
                    width: '120px', height: '120px', 
                    borderRadius: 'var(--radius)', border: '2px dashed var(--border)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }} className="hover-border-primary">
                    <Upload size={24} style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '12px' }}>Enviar Logo</span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label>Razão Social</label>
                    <input type="text" className="input" value={dadosEmpresa.razaoSocial} onChange={e => setDadosEmpresa({...dadosEmpresa, razaoSocial: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Nome Fantasia</label>
                    <input type="text" className="input" value={dadosEmpresa.nomeFantasia} onChange={e => setDadosEmpresa({...dadosEmpresa, nomeFantasia: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>CNPJ</label>
                    <input type="text" className="input" value={dadosEmpresa.cnpj} onChange={e => setDadosEmpresa({...dadosEmpresa, cnpj: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Inscrição Estadual (IE)</label>
                    <input type="text" className="input" value={dadosEmpresa.ie} onChange={e => setDadosEmpresa({...dadosEmpresa, ie: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Telefone Comercial</label>
                    <input type="text" className="input" value={dadosEmpresa.telefone} onChange={e => setDadosEmpresa({...dadosEmpresa, telefone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>E-mail Comercial</label>
                    <input type="email" className="input" value={dadosEmpresa.emailComercial} onChange={e => setDadosEmpresa({...dadosEmpresa, emailComercial: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Regime Tributário</label>
                <select className="input" value={dadosEmpresa.regimeTributario} onChange={e => setDadosEmpresa({...dadosEmpresa, regimeTributario: e.target.value})} style={{ maxWidth: '400px' }}>
                  <option value="Simples Nacional">Simples Nacional</option>
                  <option value="Lucro Presumido">Lucro Presumido</option>
                  <option value="Lucro Real">Lucro Real</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="animation-fade-in">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} color="var(--primary)" /> Endereço da Sede
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>CEP</label>
                  <input type="text" className="input" value={endereco.cep} onChange={e => setEndereco({...endereco, cep: e.target.value})} />
                </div>
                <div className="form-group" style={{ gridColumn: '2 / -1' }}>
                  <label>Logradouro (Rua/Avenida)</label>
                  <input type="text" className="input" value={endereco.logradouro} onChange={e => setEndereco({...endereco, logradouro: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label>Número</label>
                  <input type="text" className="input" value={endereco.numero} onChange={e => setEndereco({...endereco, numero: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Complemento</label>
                  <input type="text" className="input" value={endereco.complemento} onChange={e => setEndereco({...endereco, complemento: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Bairro</label>
                  <input type="text" className="input" value={endereco.bairro} onChange={e => setEndereco({...endereco, bairro: e.target.value})} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / 3' }}>
                  <label>Cidade</label>
                  <input type="text" className="input" value={endereco.cidade} onChange={e => setEndereco({...endereco, cidade: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Estado (UF)</label>
                  <select className="input" value={endereco.estado} onChange={e => setEndereco({...endereco, estado: e.target.value})}>
                    <option value="SP">SP</option>
                    <option value="RJ">RJ</option>
                    <option value="MG">MG</option>
                    <option value="RS">RS</option>
                    <option value="PR">PR</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'certificado' && (
            <div className="animation-fade-in">
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="var(--primary)" /> Certificado Digital (A1)
              </h2>

              <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', marginBottom: '32px', textAlign: 'center' }}>
                <Shield size={40} color="var(--text-secondary)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>Nenhum certificado configurado</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
                  Faça o upload do seu Certificado Digital modelo A1 (formato .pfx) para emitir Notas Fiscais diretamente pelo sistema.
                </p>
                <button className="btn btn-primary" style={{ margin: '0 auto' }}>
                  <Upload size={16} /> Importar Certificado A1
                </button>
              </div>

              <div className="form-group" style={{ maxWidth: '400px' }}>
                <label>Senha do Certificado</label>
                <input type="password" className="input" placeholder="Digite a senha do certificado após o upload" disabled />
              </div>
            </div>
          )}

          {activeTab === 'assinatura' && (
            <div className="animation-fade-in">
              {/* Banner de trial unificado */}
              {tenantStatus === 'trial' && diasRestantes !== null && (
                <div style={{
                  background: diasRestantes <= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${diasRestantes <= 3 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  borderRadius: 12, padding: '14px 20px', marginBottom: 24,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Clock size={18} color={diasRestantes <= 3 ? '#ef4444' : '#f59e0b'} />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: diasRestantes <= 3 ? '#ef4444' : '#f59e0b' }}>
                      {diasRestantes === 0
                        ? 'Seu trial expira hoje!'
                        : `Trial expira em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Escolha e assine um plano abaixo para manter sua conta ativa sem interrupções.
                    </p>
                  </div>
                  <button
                    onClick={() => document.getElementById('plans-grid-myaccount').scrollIntoView({ behavior: 'smooth' })}
                    style={{ padding: '8px 16px', borderRadius: 8, background: diasRestantes <= 3 ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, flexShrink: 0 }}
                  >
                    Ver Planos
                  </button>
                </div>
              )}

              {/* Informações da Assinatura Atual */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' }}>
                <div className="card" style={{ padding: '24px', background: 'var(--bg)', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10" />
                  <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '8px' }}>Plano Atual</h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary-light)' }}>
                      {assinatura?.plano_nome || empresa?.plano_nome || 'Starter (Demo)'}
                    </span>
                    <span style={{
                      background: `${tenantStatusInfo.color}22`,
                      color: tenantStatusInfo.color,
                      border: `1px solid ${tenantStatusInfo.color}44`,
                      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    }}>
                      {tenantStatusInfo.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {tenantStatus === 'trial' ? 'Expira em' : 'Próximo vencimento'}
                      </p>
                      <p style={{ fontSize: '13px', fontWeight: 700 }}>
                        {trialExpira
                          ? new Date(trialExpira).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                          : assinatura?.proximo_vencimento
                          ? new Date(assinatura.proximo_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                          : '—'
                        }
                      </p>
                    </div>
                    {assinatura?.valor && (
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Valor contratado</p>
                        <p style={{ fontSize: '13px', fontWeight: 700 }}>R$ {parseFloat(assinatura.valor).toFixed(2).replace('.', ',')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="card" style={{ padding: '24px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pagamento</h3>
                      <CreditCard size={18} color="var(--primary)" />
                    </div>

                    {assinatura?.mp_subscription_id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div style={{ width: '36px', height: '22px', backgroundColor: '#00aeef', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '8px', fontWeight: 900, color: '#fff' }}>MP</span>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700 }}>Mercado Pago</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Assinatura Recorrente</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '16px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Nenhum método cadastrado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Histórico de Faturas */}
              <div style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '16px' }}>Histórico de Faturas</h3>
                {faturas.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Nenhuma fatura encontrada. As faturas aparecerão aqui após os pagamentos.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Data</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Plano</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Período</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Valor</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody style={{ divideY: '1px solid var(--border)' }}>
                        {faturas.map((f) => (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover-bg-surface">
                            <td style={{ padding: '14px 16px', fontWeight: 600 }}>{new Date(f.criado_em).toLocaleDateString('pt-BR')}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{f.plano_nome}</td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{f.periodo === 'anual' ? 'Anual' : 'Mensal'}</td>
                            <td style={{ padding: '14px 16px' }}>R$ {parseFloat(f.valor).toFixed(2).replace('.', ',')}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                                background: f.status === 'ativa' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                color: f.status === 'ativa' ? '#10b981' : '#f59e0b'
                              }}>
                                {f.status === 'ativa' ? 'Pago' : 'Pendente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Grid de Planos Lindo (Interface Premium Restaurada) */}
              <div id="plans-grid-myaccount" style={{ borderTop: '1px solid var(--border)', paddingTop: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '6px' }}>
                    {tenantStatus === 'trial' ? 'Escolha seu plano e ative o Zullya ERP' : 'Altere seu plano (Upgrade/Downgrade)'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Desbloqueie todo o potencial de automação, estoque e fiscal para o seu negócio.</p>
                </div>

                {loadingSubscription && planos.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Loader2 size={28} className="animate-spin" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
                    <p style={{ fontSize: '13px' }}>Carregando opções de planos...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1200px] mx-auto px-4">
                    {(planos.length > 0 ? planos : [
                      { id: 'mock-starter', nome: 'Starter', descricao: 'Para começar a organizar suas vendas', valor_mensal: '97.00', destaque: false, max_usuarios: 3, trial_dias: 7, modulos: ['Vendas e PDV', 'Controle Financeiro', 'Cadastro de Produtos', '3 Usuários'] },
                      { id: 'mock-pro', nome: 'Pro', descricao: 'O ERP completo para sua loja crescer', valor_mensal: '197.00', destaque: true, max_usuarios: 10, trial_dias: 15, modulos: ['Todos do Starter', 'Notas Fiscais (NF-e)', 'Múltiplos Usuários (Até 10)', 'Integração de Estoque', 'B.I. Avançado'] },
                      { id: 'mock-enterprise', nome: 'Enterprise', descricao: 'Infraestrutura dedicada com suporte VIP', valor_mensal: '397.00', destaque: false, max_usuarios: 999, trial_dias: 30, modulos: ['Múltiplas Filiais', 'Usuários Ilimitados', 'API de Integração', 'Prioridade de Suporte', 'Expedição & Logística'] }
                    ]).map((plan) => {
                      const isCurrent = (assinatura?.plano_nome === plan.nome || empresa?.plano_nome === plan.nome) && tenantStatus === 'ativo';
                      const modulosArr = Array.isArray(plan.modulos)
                        ? plan.modulos
                        : (typeof plan.modulos === 'string' ? JSON.parse(plan.modulos || '[]') : []);

                      return (
                        <div
                          key={plan.id}
                          className={`glass-card flex flex-col relative transition-all duration-300 hover-lift ${plan.destaque ? 'border-primary ring-1 ring-primary/30 scale-105 z-10' : ''}`}
                          style={{ padding: '40px 32px' }}
                        >
                          {plan.destaque && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                              Mais Popular
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mb-6">
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--primary-light)' }}>
                              <PlanoIcon nome={plan.nome} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <h3 className="text-xl font-black">{plan.nome}</h3>
                              <p className="text-xs text-muted">{plan.max_usuarios} usuários · {plan.trial_dias}d trial</p>
                            </div>
                          </div>

                          <div className="mb-8" style={{ textAlign: 'left' }}>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-muted">R$</span>
                              <span className="text-5xl font-black">{Math.floor(parseFloat(plan.valor_mensal))}</span>
                              <span className="text-sm font-bold text-muted">,{(parseFloat(plan.valor_mensal) % 1 * 100).toFixed(0).padStart(2, '0')}/mês</span>
                            </div>
                            {plan.valor_anual && (
                              <p className="text-xs text-success mt-1">
                                R$ {parseFloat(plan.valor_anual).toFixed(2)}/ano (economia de 20%)
                              </p>
                            )}
                            {plan.descricao && (
                              <p className="text-sm text-muted mt-3 leading-relaxed">{plan.descricao}</p>
                            )}
                          </div>

                          <div className="space-y-3 mb-10 flex-1" style={{ textAlign: 'left' }}>
                            {modulosArr.slice(0, 8).map((m, idx) => (
                              <div key={idx} className="flex items-center gap-3 text-sm text-text">
                                <Check size={16} className="text-success shrink-0" />
                                <span>{m}</span>
                              </div>
                            ))}
                            {modulosArr.length > 8 && (
                              <div className="flex items-center gap-3 text-sm text-muted">
                                <ArrowRight size={16} className="shrink-0" />
                                <span>+{modulosArr.length - 8} módulos incluídos</span>
                              </div>
                            )}
                          </div>

                          <button
                            className={`btn btn-lg w-full font-black tracking-tight ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleUpgrade(plan)}
                          >
                            {isCurrent ? 'Plano Atual' : tenantStatus === 'trial' ? 'Assinar Agora' : 'Migrar para este plano'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
