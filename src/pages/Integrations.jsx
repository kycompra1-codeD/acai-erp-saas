// ============================================================
// HUB DE INTEGRAÇÃO — Açaí ERP SaaS
// ============================================================
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Plug, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  ShoppingBag, Webhook, Activity, ChevronRight, Settings, Clock,
  Search, Link2, Plus, Cpu, Terminal, ShoppingCart, TrendingUp, Percent, Crown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventBus, EVENTS } from '../services/eventBus';
import { useApp } from '../contexts/AppContext';
import AutomationRules from '../components/integrations/AutomationRules';
import ChannelStats from '../components/integrations/ChannelStats';

const CHANNELS = [
  { id: 'mercadolivre', name: 'Mercado Livre', category: 'Marketplace', icon: '🛒', color: '#FFE600', status: 'connected',    account: 'Loja Oficial Açaí', ordersToday: 12, lastSync: '2 min atrás',  pendingOrders: 3 },
  { id: 'shopee',       name: 'Shopee',         category: 'Marketplace', icon: '🧡', color: '#EE4D2D', status: 'connected',    account: 'Açaí Express',     ordersToday: 8,  lastSync: '5 min atrás',  pendingOrders: 1 },
  { id: 'ifood',        name: 'iFood',          category: 'Delivery',    icon: '🍕', color: '#EA1D2C', status: 'connected',    account: 'iFood Centro',     ordersToday: 25, lastSync: '1 min atrás',  pendingOrders: 7 },
  { id: 'woocommerce',  name: 'WooCommerce',    category: 'E-commerce',  icon: '🛍️', color: '#7F54B3', status: 'disconnected', account: '',                 ordersToday: 0,  lastSync: 'Nunca',        pendingOrders: 0 },
  { id: 'shopify',      name: 'Shopify',        category: 'E-commerce',  icon: '🏪', color: '#96BF48', status: 'error',        account: 'Açaí SaaS BR',     ordersToday: 0,  lastSync: '3h atrás',     pendingOrders: 0 },
  { id: 'amazon',       name: 'Amazon',         category: 'Marketplace', icon: '📦', color: '#FF9900', status: 'disconnected', account: '',                 ordersToday: 0,  lastSync: 'Nunca',        pendingOrders: 0 },
];

const CATALOG_APPS = [
  { n: 'Bling ERP', c: 'ERP e Contábil', i: '📦', color: '#00adef', popular: true, features: ['Estoque', 'Fiscal', 'Pedidos'] },
  { n: 'Tiny ERP', c: 'ERP e Contábil', i: '🏢', color: '#ff6600', popular: true, features: ['Estoque', 'Pedidos'] },
  { n: 'RD Station', c: 'Marketing', i: '📈', color: '#36344d', popular: true, features: ['CRM', 'Automação'] },
  { n: 'Zendesk', c: 'Atendimento', i: '🎧', color: '#03363d', popular: false, features: ['Suporte', 'Chat'] },
  { n: 'Mailchimp', c: 'E-mail Marketing', i: '✉️', color: '#ffe01b', popular: false, features: ['Campanhas'] },
  { n: 'WhatsApp Business', c: 'Mensageria', i: '💬', color: '#25d366', popular: true, features: ['Notificações'] },
  { n: 'Tray', c: 'E-commerce', i: '🛒', color: '#2b313d', popular: false, features: ['Vendas Online'] },
  { n: 'Nuvemshop', c: 'E-commerce', i: '☁️', color: '#2e3d98', popular: true, features: ['Vendas Online'] },
  { n: 'Loja Integrada', c: 'E-commerce', i: '🏬', color: '#000000', popular: false, features: ['Vendas Online'] },
  { n: 'Magalu (MagaLog)', c: 'Logística', i: '🚚', color: '#0086ff', popular: true, features: ['Frete', 'Rastreio'] },
  { n: 'Melhor Envio', c: 'Logística', i: '📦', color: '#1a1a1a', popular: true, features: ['Etiquetas'] },
  { n: 'Omie', c: 'ERP e Contábil', i: '💼', color: '#005cff', popular: false, features: ['Financeiro'] },
  { n: 'Conta Azul', c: 'ERP e Contábil', i: '📊', color: '#00a3e0', popular: false, features: ['Financeiro'] },
  { n: 'Inter', c: 'Financeiro', i: '🏦', color: '#ff7a00', popular: true, features: ['PIX', 'Extrato'] },
  { n: 'Stripe', c: 'Financeiro', i: '💳', color: '#635bff', popular: true, features: ['Pagamentos'] },
];

const WEBHOOKS = [
  { id: 'w1', channel: 'iFood',         event: 'order.created',   time: '14:32:01', status: 'success', orderId: '#4521' },
  { id: 'w2', channel: 'Mercado Livre', event: 'payment.approved',time: '14:30:15', status: 'success', orderId: '#4520' },
  { id: 'w3', channel: 'Shopee',        event: 'order.shipped',   time: '14:28:44', status: 'success', orderId: '#4519' },
  { id: 'w4', channel: 'Shopify',       event: 'order.created',   time: '14:15:22', status: 'error',   orderId: '#4518' },
  { id: 'w5', channel: 'iFood',         event: 'order.delivered', time: '14:10:08', status: 'success', orderId: '#4517' },
];

export default function Integrations() {
  const { products, activeCompanyId, settings } = useApp();
  const navigate = useNavigate();
  const [channels, setChannels] = useState(CHANNELS);
  const [syncing, setSyncing] = useState(null);
  const [tab, setTab] = useState('canais');
  const [configModal, setConfigModal] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [apiAccount, setApiAccount] = useState('');
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [syncLog, setSyncLog] = useState([]);
  const [catalogCategory, setCatalogCategory] = useState('Todos');

  // Multi-tenant States
  const [storeStatus, setStoreStatus] = useState({});
  const [channelConfigs, setChannelConfigs] = useState({});

  // Removendo bloqueio de plano para desenvolvimento
  const isStarter = false; // settings?.planId === 'starter';

  useEffect(() => {
    const saved = localStorage.getItem(`hub_configs_${activeCompanyId}`);
    if (saved) {
      const { status, configs } = JSON.parse(saved);
      setStoreStatus(status || {});
      setChannelConfigs(configs || {});
    } else {
      setStoreStatus({});
      setChannelConfigs({});
    }
  }, [activeCompanyId]);

  const saveConfigs = (newStatus, newConfigs) => {
    localStorage.setItem(`hub_configs_${activeCompanyId}`, JSON.stringify({
      status: newStatus || storeStatus,
      configs: newConfigs || channelConfigs
    }));
  };

  const toggleStore = (id) => {
    const current = storeStatus[id] || 'closed';
    const newStatus = { ...storeStatus, [id]: current === 'open' ? 'closed' : 'open' };
    setStoreStatus(newStatus);
    saveConfigs(newStatus, null);
    toast.success(`${id.toUpperCase()} agora está ${newStatus[id] === 'open' ? 'ABERTO' : 'FECHADO'}`);
  };

  const handleSync = (id) => {
    setSyncing(id);
    const t = toast.loading(`Sincronizando ${id}...`);
    setTimeout(() => {
      setSyncing(null);
      toast.dismiss(t);
      setChannels(prev => prev.map(c => c.id === id ? { ...c, lastSync: 'agora mesmo' } : c));
      toast.success('Dados atualizados!');
      setSyncLog(prev => [{ type: 'success', name: id, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
    }, 2000);
  };

  const connectedCount = channels.filter(c => c.status === 'connected').length;
  const totalOrders = channels.reduce((s, c) => s + c.ordersToday, 0);
  const totalPending = channels.reduce((s, c) => s + c.pendingOrders, 0);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hub de Integração</h1>
          <p className="page-subtitle">Ecossistema Omnichannel — Unidade {activeCompanyId}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCatalog(true)}>
          <Plus size={16} /> Catálogo
        </button>
      </div>

      <div className="grid-4 mb-6">
        {[
          { icon: CheckCircle2, color: 'var(--success)', val: connectedCount, label: 'Canais Ativos' },
          { icon: ShoppingBag,  color: 'var(--info)',    val: totalOrders,      label: 'Pedidos Hoje' },
          { icon: Clock,        color: 'var(--warning)', val: totalPending,     label: 'Pendentes' },
          { icon: Webhook,      color: 'var(--primary)', val: 142,              label: 'Eventos/Dia' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: `${stat.color}15` }}>
                <stat.icon size={20} color={stat.color} />
              </div>
              <div>
                <div className="stat-value">{stat.val}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        {[
          { id: 'canais', label: '🌐 Canais' },
          { id: 'mapeamento', label: '🔗 Mapeamento' },
          { id: 'automacao', label: '⚡ Automações' },
          { id: 'analytics', label: '📊 Analytics' },
          { id: 'webhooks', label: '🔔 Webhooks' },
          { id: 'log', label: '📜 Log' }
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '12px 24px', background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === t.id ? 'var(--primary-light)' : 'var(--text-muted)',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'all 0.3s'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'canais' && (
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2"><Globe size={18} /> Meus Canais Ativos</h3>
            <div className="grid-3">
              {channels.filter(ch => ch.status === 'connected' || ch.status === 'error').map(ch => (
                <div key={ch.id} className="glass-card flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 12, background: ch.color, 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 
                      }}>
                        {ch.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800 }}>{ch.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ch.category}</div>
                      </div>
                    </div>
                    {ch.status === 'connected' ? <CheckCircle2 size={18} color="var(--success)" /> : <AlertTriangle size={18} color="var(--danger)" />}
                  </div>

                  <div className="grid-2 gap-2">
                    <div className="p-3 rounded-lg bg-surface-2">
                      <div style={{ fontSize: 16, fontWeight: 800 }}>{ch.ordersToday}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Vendas Hoje</div>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-2">
                      <div style={{ fontSize: 16, fontWeight: 800, color: ch.pendingOrders > 0 ? 'var(--warning)' : 'var(--text)' }}>{ch.pendingOrders}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pendentes</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`badge ${ch.status === 'connected' ? 'badge-success' : 'badge-danger'}`}>
                       {ch.status === 'connected' ? 'Ativo e Sincronizado' : 'Falha na Sincronização'}
                    </span>
                    
                    {ch.category === 'Delivery' && ch.status === 'connected' && (
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 10, fontWeight: 800, color: storeStatus[ch.id] === 'open' ? 'var(--success)' : 'var(--danger)' }}>
                          {storeStatus[ch.id] === 'open' ? 'LOJA ABERTA' : 'LOJA FECHADA'}
                        </span>
                        <button 
                          onClick={() => toggleStore(ch.id)}
                          style={{ 
                            width: 36, height: 20, borderRadius: 12, 
                            background: storeStatus[ch.id] === 'open' ? 'var(--success)' : 'var(--surface-3)',
                            position: 'relative', cursor: 'pointer', border: 'none'
                          }}
                        >
                          <div style={{ 
                            width: 16, height: 16, borderRadius: '50%', background: 'white',
                            position: 'absolute', top: 2, 
                            left: storeStatus[ch.id] === 'open' ? 18 : 2,
                            transition: 'all 0.2s'
                          }} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button className="btn btn-secondary btn-sm flex-1" onClick={() => handleSync(ch.id)} disabled={syncing === ch.id}>
                      <RefreshCw size={14} className={syncing === ch.id ? 'animate-spin' : ''} /> Sync
                    </button>
                    {ch.category === 'Delivery' && (
                      <button className="btn btn-ghost btn-sm border border-border flex-1" onClick={() => toast.success('Cardápio sincronizado!')}>
                        <ShoppingCart size={14} /> Menu
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setConfigModal(ch)}>
                      <Settings size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-4 flex items-center gap-2"><Plug size={18} /> Canais Disponíveis para Instalar</h3>
            <div className="grid-3">
              {channels.filter(ch => ch.status === 'disconnected').map(ch => (
                <div key={ch.id} className="glass-card flex flex-col gap-4 opacity-70 hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-3">
                    <div style={{ 
                      width: 44, height: 44, borderRadius: 12, background: ch.color, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 
                    }}>
                      {ch.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800 }}>{ch.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ch.category}</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted">Venda seus produtos no {ch.name} e centralize tudo no Açaí ERP SaaS.</p>
                  <button className="btn btn-primary w-full" onClick={() => setConfigModal(ch)}>
                    <Plus size={16} /> Instalar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'mapeamento' && (
        <div className="glass-card p-0">
          <div className="p-5 border-b border-border flex justify-between items-center bg-surface-2/50">
            <div>
              <h3 className="font-bold text-lg">Mapeamento de Produtos (SKU)</h3>
              <p className="text-xs text-muted">Vincule os produtos do ERP com os anúncios nos canais de venda.</p>
            </div>
            <div className="flex gap-2">
               <input className="input-field" placeholder="Buscar por Nome ou SKU..." style={{ width: 250, height: 36 }} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-2 text-xs text-muted uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Produto Base (ERP)</th>
                  <th className="p-4 font-bold">SKU Principal</th>
                  <th className="p-4 font-bold">Mapeamento iFood</th>
                  <th className="p-4 font-bold">Mapeamento M. Livre</th>
                  <th className="p-4 font-bold text-center">Saúde</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {products.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-surface-2/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold flex items-center gap-2">
                        <span className="text-xl">{p.emoji}</span>
                        <div>
                          <div>{p.name}</div>
                          <div className="text-xs text-muted font-normal">Estoque: {p.stock} {p.unit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {p.sku ? <code className="bg-surface-3 px-2 py-1 rounded text-xs text-primary-light">{p.sku}</code> : <span className="text-xs text-danger">Sem SKU</span>}
                    </td>
                    <td className="p-4">
                      {p.mappings?.ifood ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted">{p.mappings.ifood}</code>
                          {p.mappings?.ifood_price && <span className="badge badge-success text-[10px]">R$ {p.mappings.ifood_price}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Não mapeado</span>
                      )}
                    </td>
                    <td className="p-4">
                      {p.mappings?.mercado_livre ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted">{p.mappings.mercado_livre}</code>
                          {p.mappings?.mercado_livre_price && <span className="badge badge-warning text-[10px]">R$ {p.mappings.mercado_livre_price}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Não mapeado</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {p.sku && (p.mappings?.ifood || p.mappings?.mercado_livre) ? (
                        <CheckCircle2 size={18} className="text-success mx-auto" title="Tudo OK" />
                      ) : (
                        <AlertTriangle size={18} className="text-warning mx-auto" title="Mapeamento Incompleto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'automacao' && <AutomationRules />}
      {tab === 'analytics' && <ChannelStats />}

      {tab === 'webhooks' && (
        <div className="glass-card">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold flex items-center gap-2"><Webhook size={18} /> Webhooks em Tempo Real</h3>
              <span className="badge badge-info">Escutando eventos...</span>
           </div>
           <div className="space-y-2">
              {WEBHOOKS.map(w => (
                <div key={w.id} className="p-4 rounded-xl border border-border hover:bg-surface-2 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${w.status === 'success' ? 'bg-success/10' : 'bg-danger/10'}`}>
                      <Activity size={18} color={w.status === 'success' ? 'var(--success)' : 'var(--danger)'} />
                    </div>
                    <div>
                      <div className="font-bold">{w.channel} — {w.event}</div>
                      <div className="text-xs text-muted">Pedido {w.orderId} • {w.time}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted" />
                </div>
              ))}
           </div>
        </div>
      )}

      {tab === 'log' && (
        <div className="glass-card p-0">
          <div className="p-4 border-b border-border font-bold">Histórico de Sincronização</div>
          <div className="max-h-96 overflow-y-auto">
            {syncLog.length === 0 ? (
              <div className="p-10 text-center text-muted">Nenhum log disponível.</div>
            ) : (
              syncLog.map((log, i) => (
                <div key={i} className="p-4 border-b border-border flex items-center gap-3">
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                   <div>
                     <div className="text-sm">Sincronização bem sucedida: <strong>{log.name}</strong></div>
                     <div className="text-[10px] text-muted">{log.time}</div>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Config Modal */}
      {configModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-8 border border-border">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black flex items-center gap-3">
                 <span className="text-3xl">{configModal.icon}</span> {configModal.name}
               </h3>
               <button className="btn btn-ghost btn-icon" onClick={() => setConfigModal(null)}><XCircle /></button>
            </div>
            
            <div className="space-y-6">
              <div className="form-group">
                <label className="form-label">Identificação da Conta</label>
                <input className="input-field" placeholder="Ex: Loja Matriz" value={apiAccount} onChange={e => setApiAccount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Chave de API / Token</label>
                <input className="input-field" type="password" placeholder="sk_live_..." value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
              <div className="flex gap-4 pt-4">
                <button className="btn btn-secondary flex-1" onClick={() => setConfigModal(null)}>Cancelar</button>
                <button className="btn btn-primary flex-1" onClick={() => {
                  toast.success('Conexão estabelecida!');
                  setConfigModal(null);
                }}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Catalog Modal */}
      {showCatalog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-3xl max-h-[80vh] flex flex-col p-8 border border-border">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-black">Catálogo de Integrações</h3>
               <button className="btn btn-ghost btn-icon" onClick={() => setShowCatalog(false)}><XCircle /></button>
            </div>
            <div className="grid-3 overflow-y-auto pr-4">
              {CATALOG_APPS.map(app => (
                <div key={app.n} className="p-5 border border-border rounded-2xl hover:bg-surface-2 transition-all group">
                   <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{app.i}</div>
                   <div className="font-bold mb-1">{app.n}</div>
                   <div className="text-[10px] text-muted uppercase font-black mb-4">{app.c}</div>
                   <button className="btn btn-secondary btn-sm w-full" onClick={() => {
                     toast.success(`${app.n} instalado!`);
                     setShowCatalog(false);
                   }}>Instalar</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
