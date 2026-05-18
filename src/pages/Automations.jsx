import { useState, useEffect } from 'react';
import { 
  Zap, Plus, Trash2, Play, Pause, Settings, 
  Bell, MessageSquare, Award, ArrowRight, ShieldAlert,
  Info, Save, X
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { automationService } from '../services/automationService';
import { automacoesApi } from '../services/api';
import toast from 'react-hot-toast';

function mapFromApi(r) {
  const acoes = Array.isArray(r.acoes) ? r.acoes : [];
  const condicoes = Array.isArray(r.condicoes) ? r.condicoes : [];
  const firstAction = acoes[0] ?? {};
  return {
    id: r.id,
    name: r.nome,
    trigger: r.gatilho,
    action: firstAction.tipo ?? 'action:toast',
    enabled: r.ativa,
    metadata: firstAction.metadata ?? condicoes[0]?.metadata ?? { threshold: 10, message: '', phone: '', points: 10 },
  };
}

export default function Automations() {
  const { settings } = useApp();
  const [apiRules, setApiRules] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    let mounted = true;
    automacoesApi.listar().then(res => {
      if (mounted && res?.dados) setApiRules(res.dados.map(mapFromApi));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Fallback to AppContext if API not available
  const { automationRules: ctxRules = [], addAutomationRule, updateAutomationRule, deleteAutomationRule } = useApp();
  const automationRules = apiRules ?? ctxRules;

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    trigger: 'trigger:stock_low',
    action: 'action:toast',
    enabled: true,
    metadata: { threshold: 10, message: '', phone: '', points: 10 }
  });

  const triggers = automationService.getAvailableTriggers();
  const actions = automationService.getAvailableActions();

  const handleOpenModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData(rule);
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        trigger: 'trigger:stock_low',
        action: 'action:toast',
        enabled: true,
        metadata: { threshold: 10, message: '', phone: '', points: 10 }
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) { toast.error('Dê um nome para sua automação'); return; }
    const payload = {
      nome: formData.name,
      gatilho: formData.trigger,
      ativa: formData.enabled,
      acoes: [{ tipo: formData.action, metadata: formData.metadata }],
      condicoes: [],
    };
    try {
      if (apiRules !== null) {
        if (editingRule) {
          const res = await automacoesApi.editar(editingRule.id, payload);
          if (res?.dados) setApiRules(prev => prev.map(r => r.id === editingRule.id ? mapFromApi(res.dados) : r));
          toast.success('Automação atualizada!');
        } else {
          const res = await automacoesApi.criar(payload);
          if (res?.dados) setApiRules(prev => [mapFromApi(res.dados), ...prev]);
          toast.success('Nova automação criada!');
        }
      } else {
        if (editingRule) { updateAutomationRule(editingRule.id, formData); toast.success('Automação atualizada!'); }
        else { addAutomationRule(formData); toast.success('Nova automação criada!'); }
      }
      setShowModal(false);
    } catch { toast.error('Erro ao salvar automação.'); }
  };

  const handleToggle = async (rule) => {
    if (apiRules !== null) {
      try {
        const res = await automacoesApi.toggle(rule.id);
        if (res?.dados) setApiRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: res.dados.ativa } : r));
      } catch { toast.error('Erro ao alternar automação.'); }
    } else {
      updateAutomationRule(rule.id, { enabled: !rule.enabled });
    }
  };

  const handleDelete = async (rule) => {
    if (apiRules !== null) {
      try {
        await automacoesApi.remover(rule.id);
        setApiRules(prev => prev.filter(r => r.id !== rule.id));
        toast.success('Automação removida.');
      } catch { toast.error('Erro ao remover automação.'); }
    } else {
      deleteAutomationRule(rule.id);
    }
  };

  const getTriggerLabel = (id) => triggers.find(t => t.id === id)?.label || id;
  const getActionLabel = (id) => actions.find(a => a.id === id)?.label || id;

  const isStarter = false; // settings.planId === 'starter';

  return (
    <div className="animate-fade space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Zap className="text-primary-light" size={32} />
            Automações No-Code
          </h1>
          <p className="text-muted mt-1">Crie regras inteligentes para automatizar seu negócio.</p>
        </div>
        <button className="btn btn-primary shadow-lg shadow-primary/20" onClick={() => handleOpenModal()}>
          <Plus size={20} /> Nova Automação
        </button>
      </header>

      {/* Stats/Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card flex items-center gap-4 border-l-4 border-primary">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Play size={24} />
          </div>
          <div>
            <div className="text-2xl font-black">{automationRules.filter(r => r.enabled).length}</div>
            <div className="text-xs text-muted font-bold uppercase tracking-wider">Regras Ativas</div>
          </div>
        </div>
        <div className="glass-card flex items-center gap-4 border-l-4 border-accent">
          <div className="p-3 bg-accent/10 rounded-xl text-accent">
            <Settings size={24} />
          </div>
          <div>
            <div className="text-2xl font-black">{automationRules.length}</div>
            <div className="text-xs text-muted font-bold uppercase tracking-wider">Total de Fluxos</div>
          </div>
        </div>
        <div className="glass-card flex items-center gap-4 border-l-4 border-success">
          <div className="p-3 bg-success/10 rounded-xl text-success">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="text-2xl font-black">SaaS Engine</div>
            <div className="text-xs text-muted font-bold uppercase tracking-wider">Monitoramento 24/7</div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {automationRules.length === 0 ? (
          <div className="text-center py-20 glass-card bg-white/5 border-dashed border-2">
            <Zap className="mx-auto text-muted mb-4 opacity-20" size={64} />
            <p className="text-muted text-lg">Nenhuma automação configurada ainda.</p>
            <button className="btn btn-link mt-2" onClick={() => handleOpenModal()}>Começar agora</button>
          </div>
        ) : (
          automationRules.map(rule => (
            <div key={rule.id} className={`glass-card group hover:border-primary/40 transition-all ${!rule.enabled ? 'opacity-60 grayscale' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-2xl ${rule.enabled ? 'bg-primary-glow text-primary-light' : 'bg-surface-3 text-muted'}`}>
                    {rule.trigger.includes('stock') ? <ShieldAlert size={28} /> : 
                     rule.trigger.includes('sale') ? <ArrowRight size={28} /> : <Zap size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                      {rule.name}
                      {!rule.enabled && <span className="text-[10px] bg-surface-3 px-2 py-0.5 rounded text-muted font-black uppercase">Pausada</span>}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-muted">
                        <Play size={14} /> 
                        SE <strong className="text-white">{getTriggerLabel(rule.trigger)}</strong>
                      </span>
                      <ArrowRight size={14} className="text-primary" />
                      <span className="flex items-center gap-1 text-muted">
                        <Settings size={14} /> 
                        ENTÃO <strong className="text-white">{getActionLabel(rule.action)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                  <button
                    className={`btn btn-icon ${rule.enabled ? 'text-warning' : 'text-success'}`}
                    onClick={() => handleToggle(rule)}
                    title={rule.enabled ? 'Pausar' : 'Ativar'}
                  >
                    {rule.enabled ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button className="btn btn-icon text-white/50 hover:text-white" onClick={() => handleOpenModal(rule)}>
                    <Settings size={20} />
                  </button>
                  <button className="btn btn-icon text-danger/50 hover:text-danger" onClick={() => handleDelete(rule)}>
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade">
          <div className="glass-card w-full max-w-2xl bg-[#1A1A1A] p-0 overflow-hidden shadow-2xl border-white/10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary-glow/10">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Zap className="text-primary-light" size={24} />
                {editingRule ? 'Editar Automação' : 'Criar Novo Fluxo'}
              </h2>
              <button className="text-muted hover:text-white" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>

            <div className="p-8 space-y-6">
              {/* Nome */}
              <div>
                <label className="block text-xs font-black text-muted uppercase tracking-wider mb-2">Nome da Regra</label>
                <input 
                  type="text" 
                  className="input w-full bg-surface-2"
                  placeholder="Ex: Alerta Gerencial de Estoque"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trigger */}
                <div>
                  <label className="block text-xs font-black text-muted uppercase tracking-wider mb-2">Gatilho (Tratamento)</label>
                  <select 
                    className="input w-full bg-surface-2"
                    value={formData.trigger}
                    onChange={e => setFormData({ ...formData, trigger: e.target.value })}
                  >
                    {triggers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <p className="text-[10px] text-muted mt-2">Evento que dispara a automação.</p>
                </div>

                {/* Action */}
                <div>
                  <label className="block text-xs font-black text-muted uppercase tracking-wider mb-2">Ação (Execução)</label>
                  <select 
                    className="input w-full bg-surface-2"
                    value={formData.action}
                    onChange={e => setFormData({ ...formData, action: e.target.value })}
                  >
                    {actions.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  <p className="text-[10px] text-muted mt-2">O que o sistema deve fazer.</p>
                </div>
              </div>

              {/* Configurações Dinâmicas da Metadata */}
              <div className="p-6 bg-surface-2 rounded-2xl border border-white/5 space-y-4">
                <h4 className="text-xs font-black text-primary-light uppercase flex items-center gap-2">
                  <Info size={14} /> Configurações Específicas
                </h4>
                
                {formData.trigger === 'trigger:stock_low' && (
                  <div>
                    <label className="block text-xs text-muted mb-2">Threshold (Nível de Alerta)</label>
                    <input 
                      type="number" 
                      className="input w-full bg-surface-3"
                      value={formData.metadata.threshold}
                      onChange={e => setFormData({ ...formData, metadata: { ...formData.metadata, threshold: e.target.value } })}
                    />
                  </div>
                )}

                {(formData.action === 'action:toast' || formData.action === 'action:whatsapp_alert') && (
                  <div>
                    <label className="block text-xs text-muted mb-2">Mensagem do Alerta</label>
                    <textarea 
                      className="input w-full bg-surface-3 h-20 resize-none"
                      placeholder="Sua mensagem aqui..."
                      value={formData.metadata.message}
                      onChange={e => setFormData({ ...formData, metadata: { ...formData.metadata, message: e.target.value } })}
                    />
                  </div>
                )}

                {formData.action === 'action:whatsapp_alert' && (
                  <div>
                    <label className="block text-xs text-muted mb-2">Número WhatsApp (com DDD)</label>
                    <input 
                      type="text" 
                      className="input w-full bg-surface-3"
                      placeholder="(11) 99999-0000"
                      value={formData.metadata.phone}
                      onChange={e => setFormData({ ...formData, metadata: { ...formData.metadata, phone: e.target.value } })}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-surface-2 border-t border-white/5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted font-bold">
                <Info size={14} /> Mudanças salvas instantaneamente.
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="btn btn-primary px-8" onClick={handleSave}>
                  <Save size={18} /> {editingRule ? 'Atualizar' : 'Criar Automação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
