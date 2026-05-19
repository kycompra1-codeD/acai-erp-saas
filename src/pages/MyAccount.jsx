import { useState, useEffect } from 'react';
import {
  User, Building2, MapPin, Shield, CreditCard, Upload, Save,
  Check, Zap, Crown, ShieldCheck, Loader2, Clock,
  KeyRound, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import CheckoutModal from '../components/CheckoutModal';
import { useAuth } from '../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api';

function authFetch(path, options = {}) {
  const token = localStorage.getItem('zullya_access_token');
  return fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
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
  ativo:        { label: 'Ativo',        color: '#10b981' },
  trial:        { label: 'Em trial',     color: '#f59e0b' },
  expirado:     { label: 'Expirado',     color: '#ef4444' },
  suspenso:     { label: 'Suspenso',     color: '#ef4444' },
  cancelado:    { label: 'Cancelado',    color: '#6b7280' },
  inadimplente: { label: 'Inadimplente', color: '#ef4444' },
};

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export default function MyAccount() {
  const { empresa, user } = useAuth();
  const [activeTab, setActiveTab] = useState('perfil');

  // ── Perfil do usuário ──────────────────────────────────────
  const [perfil, setPerfil] = useState({ nome: '', email: '', celular: '', usaGoogle: false });
  const [savingPerfil, setSavingPerfil] = useState(false);

  // ── Troca de senha ─────────────────────────────────────────
  const [senha, setSenha] = useState({ atual: '', nova: '', confirma: '' });
  const [showSenha, setShowSenha] = useState({ atual: false, nova: false, confirma: false });
  const [savingSenha, setSavingSenha] = useState(false);

  // ── Dados da empresa ──────────────────────────────────────
  const [dadosEmpresa, setDadosEmpresa] = useState({
    razaoSocial: '', nomeFantasia: '', cnpj: '', ie: '', ieIsento: false,
    im: '', cnae: '', website: '', tipoPessoa: 'PJ', telefone: '',
    emailComercial: '', regimeTributario: 'Simples Nacional',
    responsavelNome: '', responsavelEmail: '', responsavelCelular: '',
  });
  const [savingEmpresa, setSavingEmpresa] = useState(false);

  // ── Endereço ──────────────────────────────────────────────
  const [endereco, setEndereco] = useState({
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP',
  });
  const [savingEnd, setSavingEnd] = useState(false);

  // ── Assinatura ───────────────────────────────────────────
  const [planos, setPlanos] = useState([]);
  const [assinatura, setAssinatura] = useState(null);
  const [faturas, setFaturas] = useState([]);
  const [loadingAssinatura, setLoadingAssinatura] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // ── Carregar dados ao montar ──────────────────────────────
  useEffect(() => {
    // Perfil do usuário logado
    authFetch('/usuarios/eu')
      .then(r => {
        if (r.sucesso) {
          const d = r.dados;
          setPerfil({ nome: d.nome || '', email: d.email || '', celular: d.celular || '', usaGoogle: d.usa_google || false });
        }
      })
      .catch(() => {
        if (user) setPerfil(p => ({ ...p, nome: user.name || '', email: user.email || '' }));
      });

    // Perfil da empresa
    authFetch('/tenants/perfil')
      .then(r => {
        if (!r.sucesso) return;
        const d = r.dados;
        setDadosEmpresa({
          razaoSocial:       d.razao_social       || '',
          nomeFantasia:      d.nome_empresa        || '',
          cnpj:              d.cnpj                || '',
          ie:                d.inscricao_estadual  || '',
          ieIsento:          d.ie_isento           || false,
          im:                d.inscricao_municipal || '',
          cnae:              d.cnae                || '',
          website:           d.website             || '',
          tipoPessoa:        d.tipo_pessoa         || 'PJ',
          telefone:          d.telefone            || '',
          emailComercial:    d.email_comercial || d.email_contato || '',
          regimeTributario:  d.regime_tributario   || 'Simples Nacional',
          responsavelNome:   d.responsavel_nome    || '',
          responsavelEmail:  d.responsavel_email   || '',
          responsavelCelular:d.responsavel_celular || '',
        });
        setEndereco({
          cep:         d.cep         || '',
          logradouro:  d.logradouro  || '',
          numero:      d.numero      || '',
          complemento: d.complemento || '',
          bairro:      d.bairro      || '',
          cidade:      d.cidade      || '',
          estado:      d.estado      || 'SP',
        });
      })
      .catch(() => {});

    // Assinatura e planos
    const carregarAssinatura = async () => {
      setLoadingAssinatura(true);
      try {
        const [planosRes, assinaturaRes, faturasRes] = await Promise.all([
          fetch(`${API}/pagamentos/planos`).then(r => r.json()).catch(() => ({ sucesso: false })),
          authFetch('/pagamentos/minha-assinatura').catch(() => ({ sucesso: false })),
          authFetch('/pagamentos/faturas').catch(() => ({ sucesso: false })),
        ]);
        if (planosRes.sucesso) setPlanos(planosRes.dados);
        if (assinaturaRes.sucesso) setAssinatura(assinaturaRes.dados);
        if (faturasRes.sucesso) setFaturas(faturasRes.dados);
      } catch (e) {}
      finally { setLoadingAssinatura(false); }
    };
    carregarAssinatura();
  }, []);

  // Retorno do Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pg = params.get('pagamento');
    if (pg === 'aprovado') { toast.success('Pagamento aprovado! Conta ativada.'); window.history.replaceState({}, '', '/my-account'); setActiveTab('assinatura'); }
    else if (pg === 'falhou') { toast.error('Pagamento não aprovado. Tente novamente.'); window.history.replaceState({}, '', '/my-account'); setActiveTab('assinatura'); }
    else if (pg === 'pendente') { toast('Pagamento em processamento.', { icon: '⏳' }); window.history.replaceState({}, '', '/my-account'); setActiveTab('assinatura'); }
  }, []);

  // ── Handlers de salvamento ────────────────────────────────
  const handleSalvarPerfil = async () => {
    setSavingPerfil(true);
    try {
      const r = await authFetch('/usuarios/eu', {
        method: 'PATCH',
        body: JSON.stringify({ nome: perfil.nome, celular: perfil.celular }),
      });
      if (r.sucesso) toast.success('Perfil atualizado!');
      else toast.error(r.mensagem || 'Erro ao salvar');
    } catch { toast.error('Erro ao conectar'); }
    finally { setSavingPerfil(false); }
  };

  const handleSalvarSenha = async () => {
    if (!senha.atual) { toast.error('Informe a senha atual'); return; }
    if (senha.nova.length < 6) { toast.error('Nova senha: mínimo 6 caracteres'); return; }
    if (senha.nova !== senha.confirma) { toast.error('As senhas não conferem'); return; }
    setSavingSenha(true);
    try {
      const r = await authFetch('/usuarios/eu/senha', {
        method: 'PATCH',
        body: JSON.stringify({ senha_atual: senha.atual, nova_senha: senha.nova }),
      });
      if (r.sucesso) {
        toast.success('Senha alterada com sucesso!');
        setSenha({ atual: '', nova: '', confirma: '' });
      } else toast.error(r.mensagem || 'Erro ao alterar senha');
    } catch { toast.error('Erro ao conectar'); }
    finally { setSavingSenha(false); }
  };

  const handleSalvarEmpresa = async () => {
    setSavingEmpresa(true);
    try {
      const r = await authFetch('/tenants/perfil', {
        method: 'PATCH',
        body: JSON.stringify({
          nome_empresa:        dadosEmpresa.nomeFantasia,
          razao_social:        dadosEmpresa.razaoSocial,
          cnpj:                dadosEmpresa.cnpj,
          inscricao_estadual:  dadosEmpresa.ie,
          ie_isento:           dadosEmpresa.ieIsento,
          inscricao_municipal: dadosEmpresa.im,
          cnae:                dadosEmpresa.cnae,
          website:             dadosEmpresa.website,
          tipo_pessoa:         dadosEmpresa.tipoPessoa,
          regime_tributario:   dadosEmpresa.regimeTributario,
          telefone:            dadosEmpresa.telefone,
          email_comercial:     dadosEmpresa.emailComercial,
          responsavel_nome:    dadosEmpresa.responsavelNome,
          responsavel_email:   dadosEmpresa.responsavelEmail,
          responsavel_celular: dadosEmpresa.responsavelCelular,
          cep:                 endereco.cep,
          logradouro:          endereco.logradouro,
          numero:              endereco.numero,
          complemento:         endereco.complemento,
          bairro:              endereco.bairro,
          cidade:              endereco.cidade,
          estado:              endereco.estado,
        }),
      });
      if (r.sucesso) toast.success('Dados da empresa salvos!');
      else toast.error(r.mensagem || 'Erro ao salvar');
    } catch { toast.error('Erro ao conectar'); }
    finally { setSavingEmpresa(false); }
  };

  const tenantStatus = empresa?.status || user?.empresa?.status || 'trial';
  const tenantStatusInfo = STATUS_LABEL[tenantStatus] || STATUS_LABEL.trial;
  const trialExpira = empresa?.trial_expira_em || assinatura?.trial_expira_em;
  const diasRestantes = trialExpira
    ? Math.max(0, Math.ceil((new Date(trialExpira) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const tabs = [
    { id: 'perfil',     label: 'Meu Perfil',          icon: User },
    { id: 'empresa',    label: 'Dados da Empresa',     icon: Building2 },
    { id: 'certificado',label: 'Certificado Digital',  icon: Shield },
    { id: 'assinatura', label: 'Assinatura e Planos',  icon: CreditCard },
  ];

  // Iniciais do usuário para avatar
  const initials = perfil.nome ? perfil.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U';

  return (
    <div className="page-container pb-12">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Minha Conta</h1>
          <p className="page-subtitle">Gerencie seu perfil, dados corporativos e plano do sistema.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Card do usuário */}
          <div className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 22, fontWeight: 900, color: '#fff' }}>
              {initials}
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: 'var(--text)' }}>{perfil.nome || '—'}</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{perfil.email}</p>
            <span style={{
              display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
              background: `${tenantStatusInfo.color}22`, color: tenantStatusInfo.color, border: `1px solid ${tenantStatusInfo.color}33`
            }}>
              {tenantStatusInfo.label}
            </span>
            {tenantStatus === 'trial' && diasRestantes !== null && (
              <p style={{ fontSize: 10, color: diasRestantes <= 3 ? '#ef4444' : '#f59e0b', marginTop: 6, fontWeight: 600 }}>
                {diasRestantes === 0 ? 'Trial expira hoje!' : `Trial: ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="card" style={{ padding: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 'var(--radius)', border: 'none',
                  background: activeTab === tab.id ? 'rgba(124,58,237,0.1)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? 700 : 500, cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, transition: 'all 0.15s',
                }}>
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Conteúdo das tabs ── */}
        <div>

          {/* ━━ Meu Perfil ━━ */}
          {activeTab === 'perfil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Dados pessoais */}
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={18} color="var(--primary)" /> Dados Pessoais
                  </h2>
                  {perfil.usaGoogle && (
                    <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>
                      Conta Google
                    </span>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Nome Completo</label>
                    <input className="input" type="text" value={perfil.nome}
                      onChange={e => setPerfil(p => ({ ...p, nome: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>E-mail de Acesso</label>
                    <input className="input" type="email" value={perfil.email} disabled
                      style={{ opacity: 0.6 }} title="Entre em contato com o suporte para alterar o e-mail" />
                  </div>
                  <div className="form-group">
                    <label>Celular / WhatsApp</label>
                    <input className="input" type="text" value={perfil.celular}
                      onChange={e => setPerfil(p => ({ ...p, celular: e.target.value }))}
                      placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <button className="btn btn-primary" onClick={handleSalvarPerfil} disabled={savingPerfil}>
                    {savingPerfil ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {savingPerfil ? 'Salvando...' : 'Salvar Perfil'}
                  </button>
                </div>
              </div>

              {/* Alterar senha */}
              {!perfil.usaGoogle && (
                <div className="card" style={{ padding: 28 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <KeyRound size={18} color="var(--primary)" /> Alterar Senha
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {[
                      { key: 'atual',    label: 'Senha Atual',        field: senha.atual,    ph: 'Senha atual' },
                      { key: 'nova',     label: 'Nova Senha',         field: senha.nova,     ph: 'Mínimo 6 caracteres' },
                      { key: 'confirma', label: 'Confirmar Nova Senha', field: senha.confirma, ph: 'Repita a nova senha' },
                    ].map(({ key, label, field, ph }) => (
                      <div key={key} className="form-group">
                        <label>{label}</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            className="input"
                            type={showSenha[key] ? 'text' : 'password'}
                            value={field}
                            onChange={e => setSenha(s => ({ ...s, [key]: e.target.value }))}
                            placeholder={ph}
                            style={{ paddingRight: 36 }}
                          />
                          <button
                            onClick={() => setShowSenha(s => ({ ...s, [key]: !s[key] }))}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }}
                          >
                            {showSenha[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {senha.nova && senha.confirma && senha.nova !== senha.confirma && (
                    <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>As senhas não conferem</p>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={handleSalvarSenha} disabled={savingSenha}>
                      {savingSenha ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                      {savingSenha ? 'Alterando...' : 'Alterar Senha'}
                    </button>
                  </div>
                </div>
              )}

              {perfil.usaGoogle && (
                <div className="card" style={{ padding: 20, border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.04)' }}>
                  <p style={{ fontSize: 13, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={15} /> Sua conta usa autenticação Google. Gerencie a senha diretamente na sua conta Google.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ━━ Dados da Empresa ━━ */}
          {activeTab === 'empresa' && (
            <div className="card animation-fade-in" style={{ padding: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <Building2 size={18} color="var(--primary)" /> Dados da Empresa
              </h2>

              {/* Logo + campos principais lado a lado */}
              <div style={{ display: 'flex', gap: 28, marginBottom: 24 }}>
                <div style={{ flexShrink: 0 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Logotipo</label>
                  <div style={{ width: 110, height: 110, borderRadius: 12, border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text-secondary)', gap: 8 }}>
                    <Upload size={22} />
                    <span style={{ fontSize: 11 }}>Enviar Logo</span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>Tipo de Pessoa</label>
                    <select className="input" value={dadosEmpresa.tipoPessoa} onChange={e => setDadosEmpresa(d => ({ ...d, tipoPessoa: e.target.value }))}>
                      <option value="PJ">Pessoa Jurídica (PJ)</option>
                      <option value="PF">Pessoa Física (PF)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Regime Tributário</label>
                    <select className="input" value={dadosEmpresa.regimeTributario} onChange={e => setDadosEmpresa(d => ({ ...d, regimeTributario: e.target.value }))}>
                      <option value="Simples Nacional">Simples Nacional</option>
                      <option value="Lucro Presumido">Lucro Presumido</option>
                      <option value="Lucro Real">Lucro Real</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Razão Social</label>
                    <input className="input" value={dadosEmpresa.razaoSocial} onChange={e => setDadosEmpresa(d => ({ ...d, razaoSocial: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Nome Fantasia</label>
                    <input className="input" value={dadosEmpresa.nomeFantasia} onChange={e => setDadosEmpresa(d => ({ ...d, nomeFantasia: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Dados fiscais */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Dados Fiscais</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label>CNPJ {dadosEmpresa.tipoPessoa === 'PF' ? '/ CPF' : ''}</label>
                  <input className="input" value={dadosEmpresa.cnpj} onChange={e => setDadosEmpresa(d => ({ ...d, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
                </div>
                <div className="form-group">
                  <label>Inscrição Estadual (IE)</label>
                  <input className="input" value={dadosEmpresa.ie} disabled={dadosEmpresa.ieIsento}
                    onChange={e => setDadosEmpresa(d => ({ ...d, ie: e.target.value }))} placeholder="Isento" />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <input type="checkbox" checked={dadosEmpresa.ieIsento}
                      onChange={e => setDadosEmpresa(d => ({ ...d, ieIsento: e.target.checked, ie: e.target.checked ? 'ISENTO' : '' }))}
                      style={{ width: 15, height: 15 }} />
                    IE Isento
                  </label>
                </div>
                <div className="form-group">
                  <label>Inscrição Municipal (IM)</label>
                  <input className="input" value={dadosEmpresa.im} onChange={e => setDadosEmpresa(d => ({ ...d, im: e.target.value }))} placeholder="0000000" />
                </div>
                <div className="form-group">
                  <label>CNAE</label>
                  <input className="input" value={dadosEmpresa.cnae} onChange={e => setDadosEmpresa(d => ({ ...d, cnae: e.target.value }))} placeholder="0000-0/00" />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input className="input" type="url" value={dadosEmpresa.website} onChange={e => setDadosEmpresa(d => ({ ...d, website: e.target.value }))} placeholder="https://www.empresa.com.br" />
                </div>
              </div>

              {/* Contato */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Contato</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label>Telefone Comercial</label>
                  <input className="input" value={dadosEmpresa.telefone} onChange={e => setDadosEmpresa(d => ({ ...d, telefone: e.target.value }))} placeholder="(11) 3000-0000" />
                </div>
                <div className="form-group">
                  <label>E-mail Comercial</label>
                  <input className="input" type="email" value={dadosEmpresa.emailComercial} onChange={e => setDadosEmpresa(d => ({ ...d, emailComercial: e.target.value }))} />
                </div>
              </div>

              {/* Responsável */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Pessoa Responsável</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label>Nome do Responsável</label>
                  <input className="input" value={dadosEmpresa.responsavelNome} onChange={e => setDadosEmpresa(d => ({ ...d, responsavelNome: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>E-mail do Responsável</label>
                  <input className="input" type="email" value={dadosEmpresa.responsavelEmail} onChange={e => setDadosEmpresa(d => ({ ...d, responsavelEmail: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Celular / WhatsApp</label>
                  <input className="input" value={dadosEmpresa.responsavelCelular} onChange={e => setDadosEmpresa(d => ({ ...d, responsavelCelular: e.target.value }))} placeholder="(11) 99999-9999" />
                </div>
              </div>

              {/* Endereço (Movido para cá) */}
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8 }}>Endereço</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 120px', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>CEP</label>
                  <input className="input" value={endereco.cep} onChange={e => setEndereco(d => ({ ...d, cep: e.target.value }))} placeholder="00000-000" />
                </div>
                <div className="form-group">
                  <label>Logradouro</label>
                  <input className="input" value={endereco.logradouro} onChange={e => setEndereco(d => ({ ...d, logradouro: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Número</label>
                  <input className="input" value={endereco.numero} onChange={e => setEndereco(d => ({ ...d, numero: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>Complemento</label>
                  <input className="input" value={endereco.complemento} onChange={e => setEndereco(d => ({ ...d, complemento: e.target.value }))} placeholder="Sala 10" />
                </div>
                <div className="form-group">
                  <label>Bairro</label>
                  <input className="input" value={endereco.bairro} onChange={e => setEndereco(d => ({ ...d, bairro: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Cidade</label>
                  <input className="input" value={endereco.cidade} onChange={e => setEndereco(d => ({ ...d, cidade: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, marginBottom: 24 }}>
                <div className="form-group">
                  <label>Estado (UF)</label>
                  <select className="input" value={endereco.estado} onChange={e => setEndereco(d => ({ ...d, estado: e.target.value }))}>
                    {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSalvarEmpresa} 
                  disabled={savingEmpresa}
                  style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                >
                  {savingEmpresa ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {savingEmpresa ? 'Salvando...' : 'Salvar Dados da Empresa'}
                </button>
              </div>
            </div>
          )}

          {/* ━━ Certificado Digital ━━ */}
          {activeTab === 'certificado' && (
            <div className="card animation-fade-in" style={{ padding: 28 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <Shield size={18} color="var(--primary)" /> Certificado Digital A1
              </h2>
              <div style={{ background: 'var(--bg)', padding: 32, borderRadius: 12, border: '1px dashed var(--border)', textAlign: 'center', marginBottom: 24 }}>
                <Shield size={40} color="var(--text-secondary)" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Nenhum certificado configurado</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 20px' }}>
                  Faça o upload do seu Certificado Digital A1 (.pfx) para emitir Notas Fiscais (NF-e / NFC-e) diretamente pelo Zullya ERP.
                </p>
                <button className="btn btn-primary" style={{ margin: '0 auto' }}>
                  <Upload size={15} /> Importar Certificado A1
                </button>
              </div>
              <div className="form-group" style={{ maxWidth: 360 }}>
                <label>Senha do Certificado</label>
                <input type="password" className="input" placeholder="Após importar o certificado" disabled />
              </div>
            </div>
          )}

          {/* ━━ Assinatura e Planos ━━ */}
          {activeTab === 'assinatura' && (
            <div className="animation-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {tenantStatus === 'trial' && diasRestantes !== null && (
                <div style={{ background: diasRestantes <= 3 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${diasRestantes <= 3 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Clock size={18} color={diasRestantes <= 3 ? '#ef4444' : '#f59e0b'} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: diasRestantes <= 3 ? '#ef4444' : '#f59e0b' }}>
                      {diasRestantes === 0 ? 'Trial expira hoje!' : `Trial: ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Assine um plano abaixo para manter acesso sem interrupções.</p>
                  </div>
                  <button onClick={() => document.getElementById('plans-grid').scrollIntoView({ behavior: 'smooth' })} style={{ padding: '8px 16px', borderRadius: 8, background: diasRestantes <= 3 ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    Ver Planos
                  </button>
                </div>
              )}

              {/* Assinatura atual */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                <div className="card" style={{ padding: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Plano Atual</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary-light)' }}>
                      {assinatura?.plano_nome || empresa?.plano_nome || 'Starter (Demo)'}
                    </span>
                    <span style={{ background: `${tenantStatusInfo.color}22`, color: tenantStatusInfo.color, border: `1px solid ${tenantStatusInfo.color}44`, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                      {tenantStatusInfo.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 24, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{tenantStatus === 'trial' ? 'Trial expira em' : 'Próx. vencimento'}</p>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>
                        {trialExpira ? new Date(trialExpira).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                          : assinatura?.proximo_vencimento ? new Date(assinatura.proximo_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                    {assinatura?.valor && (
                      <div>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Valor contratado</p>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>R$ {parseFloat(assinatura.valor).toFixed(2).replace('.', ',')}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pagamento</p>
                    <CreditCard size={16} color="var(--primary)" />
                  </div>
                  {assinatura?.mp_subscription_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ width: 32, height: 20, background: '#00aeef', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 7, fontWeight: 900, color: '#fff' }}>MP</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700 }}>Mercado Pago</p>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Recorrente</p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '14px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px dashed var(--border)', textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Nenhum método cadastrado</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Faturas */}
              <div className="card" style={{ padding: 24 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Histórico de Faturas</p>
                {faturas.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '24px 0', textAlign: 'center' }}>Nenhuma fatura encontrada.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Data', 'Plano', 'Período', 'Valor', 'Status'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 11 }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{faturas.map(f => (
                        <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 12px' }}>{new Date(f.criado_em).toLocaleDateString('pt-BR')}</td>
                          <td style={{ padding: '12px 12px', color: 'var(--text-secondary)' }}>{f.plano_nome}</td>
                          <td style={{ padding: '12px 12px', color: 'var(--text-secondary)' }}>{f.periodo === 'anual' ? 'Anual' : 'Mensal'}</td>
                          <td style={{ padding: '12px 12px', fontWeight: 600 }}>R$ {parseFloat(f.valor).toFixed(2).replace('.', ',')}</td>
                          <td style={{ padding: '12px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: f.status === 'ativa' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: f.status === 'ativa' ? '#10b981' : '#f59e0b' }}>
                              {f.status === 'ativa' ? 'Pago' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Grid de planos */}
              <div id="plans-grid" style={{ paddingTop: 8 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
                    {tenantStatus === 'trial' ? 'Escolha e ative o Zullya ERP' : 'Alterar plano'}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Desbloqueie todo o potencial para o seu negócio.</p>
                </div>
                {loadingAssinatura && planos.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    <Loader2 size={28} className="animate-spin" style={{ marginBottom: 12, color: 'var(--primary)' }} />
                    <p style={{ fontSize: 13 }}>Carregando planos...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
                    {(planos.length > 0 ? planos : [
                      { id: 'm1', nome: 'Starter', descricao: 'Para começar a organizar suas vendas', valor_mensal: '97.00', destaque: false, max_usuarios: 3, trial_dias: 7, modulos: ['Vendas e PDV', 'Financeiro', 'Cadastro de Produtos'] },
                      { id: 'm2', nome: 'Pro', descricao: 'O ERP completo para crescer', valor_mensal: '197.00', destaque: true, max_usuarios: 10, trial_dias: 15, modulos: ['Todos do Starter', 'NF-e / NFC-e', 'CRM', 'B.I. Avançado'] },
                      { id: 'm3', nome: 'Enterprise', descricao: 'Infraestrutura dedicada com suporte VIP', valor_mensal: '397.00', destaque: false, max_usuarios: 999, trial_dias: 30, modulos: ['Multi-Filial', 'Usuários Ilimitados', 'API', 'Suporte VIP'] },
                    ]).map(plan => {
                      const isCurrent = (assinatura?.plano_nome === plan.nome || empresa?.plano_nome === plan.nome) && tenantStatus === 'ativo';
                      const mods = Array.isArray(plan.modulos) ? plan.modulos : (typeof plan.modulos === 'string' ? JSON.parse(plan.modulos || '[]') : []);
                      return (
                        <div key={plan.id} className={`glass-card flex flex-col relative transition-all duration-300 hover-lift ${plan.destaque ? 'border-primary ring-1 ring-primary/30 scale-105 z-10' : ''}`} style={{ padding: '32px 24px' }}>
                          {plan.destaque && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">Mais Popular</div>}
                          <div className="flex items-center gap-3 mb-5">
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', color: 'var(--primary-light)' }}>
                              <PlanoIcon nome={plan.nome} />
                            </div>
                            <div>
                              <h3 className="text-lg font-black">{plan.nome}</h3>
                              <p className="text-xs text-muted">{plan.max_usuarios >= 999 ? 'Ilimitado' : plan.max_usuarios} usuários · {plan.trial_dias}d trial</p>
                            </div>
                          </div>
                          <div className="mb-6">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold text-muted">R$</span>
                              <span className="text-4xl font-black">{Math.floor(parseFloat(plan.valor_mensal))}</span>
                              <span className="text-sm font-bold text-muted">,{(parseFloat(plan.valor_mensal) % 1 * 100).toFixed(0).padStart(2, '0')}/mês</span>
                            </div>
                            {plan.descricao && <p className="text-sm text-muted mt-2">{plan.descricao}</p>}
                          </div>
                          <div className="space-y-2 mb-8 flex-1">
                            {mods.slice(0, 6).map((m, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <Check size={13} className="text-success shrink-0" />
                                <span>{m}</span>
                              </div>
                            ))}
                          </div>
                          <button className={`btn btn-lg w-full font-bold ${isCurrent ? 'btn-secondary' : 'btn-primary'}`} onClick={() => !isCurrent && setSelectedPlan(plan)}>
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
        <CheckoutModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} onSuccess={() => { setSelectedPlan(null); toast.success('Assinatura ativada!'); setTimeout(() => window.location.reload(), 2000); }} />
      )}
    </div>
  );
}
