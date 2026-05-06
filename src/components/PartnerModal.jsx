import { useState, useCallback, useEffect } from 'react';
import { 
  X, Save, User, MapPin, Phone, Mail, Building2, Hash, 
  ExternalLink, RefreshCw, Plus, Trash2, Globe, FileText,
  Tag, Info
} from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'geral', label: 'dados gerais' },
  { id: 'endereco', label: 'endereço' },
  { id: 'contatos', label: 'contatos' },
  { id: 'comercial', label: 'comercial' },
  { id: 'fiscal', label: 'fiscal' },
  { id: 'anexos', label: 'anexos' },
  { id: 'observacoes', label: 'observações' }
];

const EMPTY_PARTNER = {
  // Geral
  name: '',
  tradingName: '',
  code: '',
  personType: 'pj', // pf, pj, estrangeiro
  document: '', // CPF or CNPJ
  roles: ['cliente'], // cliente, fornecedor, transportador, outro
  
  // Fiscal
  taxpayerType: '9', // 1: Contribuinte ICMS, 2: Isento, 9: Não Contribuinte
  taxRegime: '0', // 0: Não informado, 1: Simples Nacional, 3: Regime Normal
  ie: '', 
  im: '',
  suframa: '',
  
  // Endereço
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country: 'Brasil',
  hasDifferentBillingAddress: false,
  
  // Contatos
  phone: '',
  phone2: '',
  mobile: '',
  website: '',
  email: '',
  emailNfe: '',
  contactPersons: [], // { name, sector, email, phone, extension }
  
  // Comercial
  crmStatus: 'cliente',
  salesperson: '',
  paymentCondition: '',
  priceList: '',
  creditLimit: 0,
  birthDate: '',

  // Outros
  notes: '',
  attachments: [], // { name, size, date }
  tags: [],
  category: 'Geral',
  discount: 0,
  rating: 5,
  status: 'ativo'
};

function formatDocument(v, type) {
  const d = v.replace(/\D/g, '');
  if (type === 'pf') {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join('.') + (e ? '-' + e : '')
    ).slice(0, 14);
  }
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, d2, e) =>
    `${a}.${b}.${c}/${d2}${e ? '-' + e : ''}`
  ).slice(0, 18);
}

export default function PartnerModal({ isOpen, onClose, onSave, initialData, mode = 'customer' }) {
  const [activeTab, setActiveTab] = useState('geral');
  const [form, setForm] = useState({ ...EMPTY_PARTNER });
  const [fetchingCep, setFetchingCep] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({ ...EMPTY_PARTNER, ...initialData });
    } else {
      setForm({ ...EMPTY_PARTNER, roles: mode === 'supplier' ? ['fornecedor'] : ['cliente'] });
    }
    setActiveTab('geral');
  }, [initialData, mode, isOpen]);

  const upd = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const toggleRole = (role) => {
    setForm(p => {
      const roles = p.roles.includes(role) 
        ? p.roles.filter(r => r !== role)
        : [...p.roles, role];
      return { ...p, roles: roles.length ? roles : [role] };
    });
  };

  const fetchCep = useCallback(async () => {
    const cep = (form.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) { toast.error('CEP deve ter 8 dígitos'); return; }
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado'); return; }
      setForm(p => ({ 
        ...p, 
        street: data.logradouro || p.street, 
        neighborhood: data.bairro || p.neighborhood, 
        city: data.localidade || p.city, 
        state: data.uf || p.state 
      }));
      toast.success('Endereço preenchido!');
    } catch { toast.error('Erro ao buscar CEP'); }
    finally { setFetchingCep(false); }
  }, [form.cep]);

  const addContactPerson = () => {
    upd('contactPersons', [...form.contactPersons, { name: '', sector: '', email: '', phone: '', extension: '' }]);
  };

  const updContactPerson = (idx, key, val) => {
    const newList = [...form.contactPersons];
    newList[idx] = { ...newList[idx], [key]: val };
    upd('contactPersons', newList);
  };

  const removeContactPerson = (idx) => {
    upd('contactPersons', form.contactPersons.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('O nome é obrigatório'); return; }
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="glass-card animate-slide" style={{ width: '100%', maxWidth: 900, padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-surface-2">
          <div className="flex items-center gap-3">
            <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary-light)' }}>
              <User size={20} />
            </div>
            <div>
              <h3 className="modal-title">Contato</h3>
              <p className="text-xs text-muted">Centralize os dados do seu parceiro de negócio</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="px-6 bg-surface-2">
          <div className="tabs-container">
            {TABS.map(t => (
              <div 
                key={t.id} 
                className={`tab-item ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          
          {activeTab === 'geral' && (
            <div className="animate-fade space-y-6">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 form-group">
                  <label className="form-label">Nome / Razão Social *</label>
                  <input 
                    className="input-field" 
                    placeholder="Nome ou Razão Social do contato" 
                    value={form.name}
                    onChange={e => upd('name', e.target.value)}
                  />
                </div>
                <div className="col-span-4 form-group">
                  <label className="form-label">Nome Fantasia</label>
                  <input 
                    className="input-field" 
                    placeholder="Apelido ou Marca" 
                    value={form.tradingName}
                    onChange={e => upd('tradingName', e.target.value)}
                  />
                </div>
                
                <div className="col-span-4 form-group">
                  <label className="form-label">Tipo de Pessoa</label>
                  <select 
                    className="input-field"
                    value={form.personType}
                    onChange={e => upd('personType', e.target.value)}
                  >
                    <option value="pj">Pessoa Jurídica</option>
                    <option value="pf">Pessoa Física</option>
                    <option value="estrangeiro">Estrangeiro</option>
                  </select>
                </div>
                
                <div className="col-span-4 form-group">
                  <label className="form-label">{form.personType === 'pj' ? 'CNPJ' : 'CPF'}</label>
                  <input 
                    className="input-field" 
                    value={form.document}
                    onChange={e => upd('document', formatDocument(e.target.value, form.personType))}
                    placeholder={form.personType === 'pj' ? '00.000.000/0001-00' : '000.000.000-00'}
                  />
                </div>
                
                <div className="col-span-4 form-group">
                  <label className="form-label">Código</label>
                  <input 
                    className="input-field" 
                    placeholder="Opcional" 
                    value={form.code}
                    onChange={e => upd('code', e.target.value)}
                  />
                </div>

                <div className="col-span-4 form-group">
                  <label className="form-label">Data de Nascimento</label>
                  <input 
                    className="input-field" 
                    type="date"
                    value={form.birthDate}
                    onChange={e => upd('birthDate', e.target.value)}
                  />
                </div>

                <div className="col-span-12">
                  <label className="form-label mb-2 block">Tipo de Contato</label>
                  <div className="flex flex-wrap gap-4 p-4 rounded bg-surface-2 border">
                    {['cliente', 'fornecedor', 'transportador', 'outro'].map(role => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={form.roles.includes(role)}
                          onChange={() => toggleRole(role)}
                          className="accent-primary"
                        />
                        <span className="text-sm capitalize">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="animate-fade space-y-6">
              <div className="label-group">
                <MapPin size={16} className="icon" />
                <h4>Endereço Principal</h4>
              </div>
              
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 form-group">
                  <label className="form-label">CEP</label>
                  <div className="relative">
                    <input 
                      className="input-field" 
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={e => upd('cep', e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                    />
                    <button 
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-white transition-colors"
                      onClick={fetchCep}
                      disabled={fetchingCep}
                    >
                      <RefreshCw size={14} className={fetchingCep ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
                <div className="col-span-8 form-group">
                  <label className="form-label">Cidade / Município</label>
                  <input 
                    className="input-field" 
                    placeholder="São Paulo" 
                    value={form.city}
                    onChange={e => upd('city', e.target.value)}
                  />
                </div>
                
                <div className="col-span-10 form-group">
                  <label className="form-label">Rua / Logradouro</label>
                  <input 
                    className="input-field" 
                    placeholder="Ex: Av. Paulista" 
                    value={form.street}
                    onChange={e => upd('street', e.target.value)}
                  />
                </div>
                <div className="col-span-2 form-group">
                  <label className="form-label">Estado</label>
                  <input 
                    className="input-field uppercase" 
                    placeholder="SP" 
                    maxLength={2}
                    value={form.state}
                    onChange={e => upd('state', e.target.value.toUpperCase())}
                  />
                </div>
                
                <div className="col-span-3 form-group">
                  <label className="form-label">Número</label>
                  <input 
                    className="input-field" 
                    placeholder="123" 
                    value={form.number}
                    onChange={e => upd('number', e.target.value)}
                  />
                </div>
                <div className="col-span-4 form-group">
                  <label className="form-label">Bairro</label>
                  <input 
                    className="input-field" 
                    placeholder="Centro" 
                    value={form.neighborhood}
                    onChange={e => upd('neighborhood', e.target.value)}
                  />
                </div>
                <div className="col-span-5 form-group">
                  <label className="form-label">Complemento</label>
                  <input 
                    className="input-field" 
                    placeholder="Apto, Bloco, etc." 
                    value={form.complement}
                    onChange={e => upd('complement', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="diff-billing"
                  checked={form.hasDifferentBillingAddress}
                  onChange={e => upd('hasDifferentBillingAddress', e.target.checked)}
                />
                <label htmlFor="diff-billing" className="text-sm text-muted">Possui endereço de cobrança diferente do principal</label>
              </div>
            </div>
          )}

          {activeTab === 'contatos' && (
            <div className="animate-fade space-y-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Telefone Fixo</label>
                  <input className="input-field" placeholder="(00) 0000-0000" value={form.phone} onChange={e => upd('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone Adicional</label>
                  <input className="input-field" placeholder="(00) 0000-0000" value={form.phone2} onChange={e => upd('phone2', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Celular / WhatsApp</label>
                  <input className="input-field" placeholder="(00) 90000-0000" value={form.mobile} onChange={e => upd('mobile', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail Principal</label>
                  <input className="input-field" placeholder="exemplo@email.com" value={form.email} onChange={e => upd('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail p/ NFe</label>
                  <input className="input-field" placeholder="nfe@email.com" value={form.emailNfe} onChange={e => upd('emailNfe', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">WebSite</label>
                  <input className="input-field" placeholder="www.site.com.br" value={form.website} onChange={e => upd('website', e.target.value)} />
                </div>
              </div>

              <div className="section-divider" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="label-group mb-0">
                    <Plus size={16} className="icon" />
                    <h4>Pessoas de Contato</h4>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={addContactPerson}>
                    <Plus size={14} /> Adicionar
                  </button>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Setor</th>
                        <th>E-mail</th>
                        <th>Telefone</th>
                        <th>Ramal</th>
                        <th width="50"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.contactPersons.map((cp, idx) => (
                        <tr key={idx}>
                          <td><input className="input-field bg-transparent border-none p-0" placeholder="Nome" value={cp.name} onChange={e => updContactPerson(idx, 'name', e.target.value)} /></td>
                          <td><input className="input-field bg-transparent border-none p-0" placeholder="Vendas" value={cp.sector} onChange={e => updContactPerson(idx, 'sector', e.target.value)} /></td>
                          <td><input className="input-field bg-transparent border-none p-0" placeholder="email@ex" value={cp.email} onChange={e => updContactPerson(idx, 'email', e.target.value)} /></td>
                          <td><input className="input-field bg-transparent border-none p-0" placeholder="(00) 0000..." value={cp.phone} onChange={e => updContactPerson(idx, 'phone', e.target.value)} /></td>
                          <td><input className="input-field bg-transparent border-none p-0" placeholder="123" value={cp.extension} onChange={e => updContactPerson(idx, 'extension', e.target.value)} /></td>
                          <td><button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => removeContactPerson(idx)}><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                      {form.contactPersons.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-muted italic text-xs">Nenhum contato adicional registrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comercial' && (
            <div className="animate-fade space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Status no CRM</label>
                  <select className="input-field" value={form.crmStatus} onChange={e => upd('crmStatus', e.target.value)}>
                    <option value="prospect">Prospect</option>
                    <option value="cliente">Cliente</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vendedor Padrão</label>
                  <input className="input-field" placeholder="Nome do vendedor" value={form.salesperson} onChange={e => upd('salesperson', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Condição de Pagamento</label>
                  <input className="input-field" placeholder="Ex: 30, 60 dias ou 3x" value={form.paymentCondition} onChange={e => upd('paymentCondition', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lista de Preços</label>
                  <select className="input-field" value={form.priceList} onChange={e => upd('priceList', e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="varejo">Varejo</option>
                    <option value="atacado">Atacado</option>
                    <option value="promocional">Promocional</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Limite de Crédito</label>
                  <input className="input-field" type="number" placeholder="R$ 0,00" value={form.creditLimit} onChange={e => upd('creditLimit', e.target.value)} />
                  <p className="text-[10px] text-muted mt-1 italic">O limite de crédito depende de permissões de perfil.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fiscal' && (
            <div className="animate-fade space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Tipo de Contribuinte</label>
                  <select className="input-field" value={form.taxpayerType} onChange={e => upd('taxpayerType', e.target.value)}>
                    <option value="1">1 - Contribuinte ICMS</option>
                    <option value="2">2 - Contribuinte isento</option>
                    <option value="9">9 - Não Contribuinte</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Regime Tributário</label>
                  <select className="input-field" value={form.taxRegime} onChange={e => upd('taxRegime', e.target.value)}>
                    <option value="0">Não informado</option>
                    <option value="1">Simples Nacional</option>
                    <option value="3">Regime Normal</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Inscrição Estadual</label>
                  <input className="input-field" placeholder="IE" value={form.ie} onChange={e => upd('ie', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Inscrição Municipal</label>
                  <input className="input-field" placeholder="IM" value={form.im} onChange={e => upd('im', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Inscrição Suframa</label>
                  <input className="input-field" placeholder="Suframa" value={form.suframa} onChange={e => upd('suframa', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Desconto Padrão (%)</label>
                  <input className="input-field" type="number" value={form.discount} onChange={e => upd('discount', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'anexos' && (
            <div className="animate-fade space-y-6">
              <div className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center flex flex-col items-center gap-4 bg-white/5">
                <div className="stat-icon" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                  <Plus size={24} />
                </div>
                <div>
                  <button className="btn btn-secondary mb-2" onClick={() => toast.error('Upload não disponível no ambiente demo')}>
                    Procurar arquivo
                  </button>
                  <p className="text-xs text-muted">O tamanho do arquivo não deve ultrapassar 2MB</p>
                </div>
              </div>
              
              {form.attachments.length > 0 && (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Nome do Arquivo</th>
                        <th>Tamanho</th>
                        <th>Data</th>
                        <th width="40"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.attachments.map((file, idx) => (
                        <tr key={idx}>
                          <td><div className="flex items-center gap-2"><FileText size={14} /> {file.name}</div></td>
                          <td>{file.size}</td>
                          <td>{file.date}</td>
                          <td><button className="btn btn-ghost btn-icon btn-sm text-danger"><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'observacoes' && (
            <div className="animate-fade space-y-4">
              <label className="form-label">Observações Internas</label>
              <textarea 
                className="input-field w-full" 
                rows={8} 
                placeholder="Notas, históricos, acordos especiais..."
                value={form.notes}
                onChange={e => upd('notes', e.target.value)}
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between bg-surface-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary px-10" onClick={handleSave}>
            <Save size={18} /> Salvar Cadastro
          </button>
        </div>
      </div>
    </div>
  );
}
