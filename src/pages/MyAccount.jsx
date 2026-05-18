import React, { useState } from 'react';
import { User, Building2, MapPin, Shield, CreditCard, Upload, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyAccount() {
  const [activeTab, setActiveTab] = useState('perfil');
  const [isLoading, setIsLoading] = useState(false);

  // Estados dos formulários (Simulando dados do usuário e empresa)
  const [perfil, setPerfil] = useState({
    nome: 'Administrador Demo',
    email: 'admin@demo.com',
    celular: '(11) 99999-9999',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });

  const [empresa, setEmpresa] = useState({
    razaoSocial: 'Zullya Sistemas Ltda',
    nomeFantasia: 'Zullya ERP',
    cnpj: '00.000.000/0001-00',
    ie: 'Isento',
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

  const handleSave = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulação de salvamento
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Dados atualizados com sucesso!');
    }, 1000);
  };

  const tabs = [
    { id: 'perfil', label: 'Meu Perfil', icon: User },
    { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'certificado', label: 'Certificado Digital', icon: Shield },
    { id: 'assinatura', label: 'Assinatura e Cobrança', icon: CreditCard },
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Minha Conta</h1>
          <p className="page-subtitle">Gerencie suas informações pessoais, dados da empresa e assinatura.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={isLoading}>
          <Save size={18} />
          {isLoading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
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
                    <input type="text" className="input" value={empresa.razaoSocial} onChange={e => setEmpresa({...empresa, razaoSocial: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Nome Fantasia</label>
                    <input type="text" className="input" value={empresa.nomeFantasia} onChange={e => setEmpresa({...empresa, nomeFantasia: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>CNPJ</label>
                    <input type="text" className="input" value={empresa.cnpj} onChange={e => setEmpresa({...empresa, cnpj: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Inscrição Estadual (IE)</label>
                    <input type="text" className="input" value={empresa.ie} onChange={e => setEmpresa({...empresa, ie: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Telefone Comercial</label>
                    <input type="text" className="input" value={empresa.telefone} onChange={e => setEmpresa({...empresa, telefone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>E-mail Comercial</label>
                    <input type="email" className="input" value={empresa.emailComercial} onChange={e => setEmpresa({...empresa, emailComercial: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Regime Tributário</label>
                <select className="input" value={empresa.regimeTributario} onChange={e => setEmpresa({...empresa, regimeTributario: e.target.value})} style={{ maxWidth: '400px' }}>
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
                    {/* Pode adicionar mais depois */}
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
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="var(--primary)" /> Detalhes da Assinatura
              </h2>
              
              <div style={{ background: 'var(--bg)', padding: '24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Plano Atual: <span style={{ color: 'var(--primary)' }}>SaaS PRO</span></h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Faturamento Mensal</p>
                  </div>
                  <div style={{ padding: '6px 12px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                    Ativo
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '32px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Próxima cobrança</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>15/06/2026</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Valor da fatura</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>R$ 149,90</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Método de pagamento</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>Cartão final 4242</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button className="btn btn-outline">Alterar Plano</button>
                <button className="btn btn-outline">Atualizar Cartão</button>
                <button className="btn btn-ghost" style={{ color: 'var(--danger)', marginLeft: 'auto' }}>Cancelar Assinatura</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
