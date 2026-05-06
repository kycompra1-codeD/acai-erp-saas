import { useState, useEffect } from 'react';
import { 
  Zap, Plus, Trash2, Play, Pause, 
  Settings, Bell, Printer, CheckCircle2, 
  Clock, AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../../contexts/AppContext';

const RULE_TEMPLATES = [
  { id: 't1', name: 'Auto-Aprovação iFood', trigger: 'Novo Pedido', channel: 'iFood', action: 'Aprovar Pedido', icon: '🍕' },
  { id: 't2', name: 'Impressão Automática', trigger: 'Pedido Confirmado', channel: 'Todos', action: 'Imprimir na Cozinha', icon: '🖨️' },
  { id: 't3', name: 'Alerta de Atraso', trigger: 'Pedido > 15min', channel: 'Delivery', action: 'Notificar Gerente', icon: '⚠️' },
];

export default function AutomationRules() {
  const { activeCompanyId } = useApp();
  const [rules, setRules] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  // Load rules
  useEffect(() => {
    const saved = localStorage.getItem(`automation_rules_${activeCompanyId}`);
    if (saved) setRules(JSON.parse(saved));
    else setRules([]);
  }, [activeCompanyId]);

  const saveRules = (newRules) => {
    setRules(newRules);
    localStorage.setItem(`automation_rules_${activeCompanyId}`, JSON.stringify(newRules));
  };

  const addRule = (template) => {
    const newRule = {
      ...template,
      id: `rule_${Date.now()}`,
      active: true,
      createdAt: new Date().toLocaleDateString()
    };
    const updated = [newRule, ...rules];
    saveRules(updated);
    setShowAdd(false);
    toast.success(`Regra "${template.name}" criada!`);
  };

  const toggleRule = (id) => {
    const updated = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
    saveRules(updated);
    const rule = updated.find(r => r.id === id);
    toast.success(`Regra ${rule.active ? 'ativada' : 'pausada'}`);
  };

  const deleteRule = (id) => {
    const updated = rules.filter(r => r.id !== id);
    saveRules(updated);
    toast.success('Regra removida');
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 style={{ fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={22} className="text-primary-light" /> Automações Inteligentes
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Configure gatilhos e ações automáticas para seus canais</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Nova Regra
        </button>
      </div>

      <div className="grid-3">
        {rules.map(rule => (
          <div key={rule.id} className="glass-card" style={{ 
            opacity: rule.active ? 1 : 0.6,
            border: rule.active ? '1px solid var(--primary-glow)' : '1px solid var(--border)',
            transition: 'all 0.3s'
          }}>
            <div className="flex items-start justify-between mb-4">
              <div style={{ 
                width: 40, height: 40, borderRadius: 10, 
                background: rule.active ? 'var(--primary-glow)' : 'var(--surface-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20
              }}>
                {rule.icon}
              </div>
              <div className="flex gap-1">
                <button 
                  className="btn btn-ghost btn-icon btn-xs" 
                  onClick={() => toggleRule(rule.id)}
                  title={rule.active ? 'Pausar' : 'Ativar'}
                >
                  {rule.active ? <Pause size={14} /> : <Play size={14} className="text-success" />}
                </button>
                <button className="btn btn-ghost btn-icon btn-xs text-danger" onClick={() => deleteRule(rule.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{rule.name}</div>
              <div className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <span className="badge badge-secondary" style={{ fontSize: 9 }}>{rule.channel}</span>
                <span>•</span>
                <span>{rule.trigger}</span>
              </div>
            </div>

            <div style={{ 
              background: 'var(--surface-2)', 
              borderRadius: 8, 
              padding: '10px',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <div style={{ color: 'var(--primary-light)' }}>
                {rule.action.includes('Imprimir') ? <Printer size={16} /> : <CheckCircle2 size={16} />}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{rule.action}</div>
            </div>
          </div>
        ))}

        {rules.length === 0 && !showAdd && (
          <div className="col-span-full py-12 text-center glass-card" style={{ border: '2px dashed var(--border)', background: 'transparent' }}>
             <Zap size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
             <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Nenhuma regra configurada para esta unidade.</p>
             <button className="btn btn-ghost btn-sm mt-4" onClick={() => setShowAdd(true)}>Criar minha primeira regra</button>
          </div>
        )}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', padding: 16 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 500, padding: 24, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-6">
               <h3 style={{ fontWeight: 800, fontSize: 18 }}>Modelos de Automação</h3>
               <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><Plus size={18} style={{ transform: 'rotate(45deg)' }}/></button>
            </div>

            <div className="space-y-3">
              {RULE_TEMPLATES.map(t => (
                <button 
                  key={t.id}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-surface-2 transition-all text-left group"
                  onClick={() => addRule(t)}
                >
                  <div style={{ 
                    width: 48, height: 48, borderRadius: 12, 
                    background: 'var(--surface-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                    transition: 'all 0.3s'
                  }} className="group-hover:scale-110">
                    {t.icon}
                  </div>
                  <div className="flex-1">
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Gatilho: {t.trigger} • Ação: {t.action}
                    </div>
                  </div>
                  <Plus size={18} className="text-muted group-hover:text-primary-light" />
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
               <div style={{ padding: 16, background: 'var(--info-bg)', borderRadius: 12, border: '1px solid var(--info-border)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Settings size={14} className="text-info" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--info)' }}>Customização Avançada</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Em breve você poderá criar regras personalizadas usando nosso editor visual de fluxos (No-Code).
                  </p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
