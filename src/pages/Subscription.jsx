import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, Zap, Crown, ShieldCheck, ArrowRight,
  TrendingUp, Globe, Truck, Users, CreditCard,
  FileText, Loader2, AlertCircle, Clock,
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

// Ícones por nome de plano
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

export default function Subscription() {
  const { empresa, user } = useAuth();
  const [planos, setPlanos] = useState([]);
  const [assinatura, setAssinatura] = useState(null);
  const [faturas, setFaturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Verificar retorno do Mercado Pago
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pagamento = params.get('pagamento');
    if (pagamento === 'aprovado') {
      toast.success('Pagamento aprovado! Sua conta foi ativada.');
      window.history.replaceState({}, '', '/assinatura');
    } else if (pagamento === 'falhou') {
      toast.error('Pagamento não aprovado. Tente novamente.');
      window.history.replaceState({}, '', '/assinatura');
    } else if (pagamento === 'pendente') {
      toast('Pagamento em processamento. Você receberá uma confirmação em breve.', { icon: '⏳' });
      window.history.replaceState({}, '', '/assinatura');
    }
  }, []);

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const [planosRes, assinaturaRes, faturasRes] = await Promise.all([
          fetch(`${API}/pagamentos/planos`).then(r => r.json()),
          authFetch('/pagamentos/minha-assinatura'),
          authFetch('/pagamentos/faturas'),
        ]);
        if (planosRes.sucesso) setPlanos(planosRes.dados);
        if (assinaturaRes.sucesso) setAssinatura(assinaturaRes.dados);
        if (faturasRes.sucesso) setFaturas(faturasRes.dados);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  const tenantStatus = empresa?.status || user?.empresa?.status || 'trial';
  const tenantStatusInfo = STATUS_LABEL[tenantStatus] || STATUS_LABEL.trial;
  const trialExpira = empresa?.trial_expira_em || assinatura?.trial_expira_em;
  const diasRestantes = trialExpira
    ? Math.max(0, Math.ceil((new Date(trialExpira) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="animate-fade pb-12">
      {/* Banner de trial */}
      {tenantStatus === 'trial' && diasRestantes !== null && (
        <div style={{
          background: diasRestantes <= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${diasRestantes <= 3 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: 12, padding: '14px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Clock size={18} color={diasRestantes <= 3 ? '#ef4444' : '#f59e0b'} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: diasRestantes <= 3 ? '#ef4444' : '#f59e0b' }}>
              {diasRestantes === 0
                ? 'Seu trial expira hoje!'
                : `Trial expira em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}`}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Assine um plano abaixo para continuar usando o Zullya ERP sem interrupção.
            </p>
          </div>
          <button
            onClick={() => document.getElementById('plans-grid').scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '8px 16px', borderRadius: 8, background: diasRestantes <= 3 ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, flexShrink: 0 }}
          >
            Ver Planos
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-10">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold mb-4">Gestão de Assinatura</h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Acompanhe seu plano atual, histórico de faturas e faça upgrades.
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plano Atual */}
          <div className="glass-card lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10" />
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Plano Atual</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-primary-light">
                    {assinatura?.plano_nome || empresa?.plano_nome || 'Starter'}
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
              </div>
              <div className="text-right">
                <div className="text-sm text-muted">
                  {tenantStatus === 'trial' ? 'Trial expira em' : 'Próxima renovação'}
                </div>
                <div className="font-bold">
                  {trialExpira
                    ? new Date(trialExpira).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : assinatura?.proximo_vencimento
                    ? new Date(assinatura.proximo_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                    : '—'
                  }
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                className="btn btn-outline"
                onClick={() => document.getElementById('plans-grid').scrollIntoView({ behavior: 'smooth' })}
              >
                {tenantStatus === 'trial' ? 'Assinar Agora' : 'Alterar Plano'}
              </button>
              {tenantStatus === 'ativo' && (
                <button className="btn btn-ghost text-danger hover:bg-danger/10" onClick={() => toast('Para cancelar, entre em contato com o suporte.', { icon: '💬' })}>
                  Cancelar Assinatura
                </button>
              )}
            </div>
          </div>

          {/* Método de pagamento */}
          <div className="glass-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Pagamento</h3>
                <CreditCard size={18} className="text-primary-light" />
              </div>
              {assinatura?.gateway_subscription_id || assinatura?.gateway_payment_id ? (
                <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                  <div className="w-10 h-6 bg-[#00aeef] rounded flex items-center justify-center">
                    <span className="text-[9px] font-black text-white">MP</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold">Mercado Pago</div>
                    <div className="text-[10px] text-muted">Assinatura recorrente</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-surface-2 rounded-lg border border-dashed border-border text-center">
                  <p className="text-xs text-muted">Nenhum método de pagamento cadastrado</p>
                </div>
              )}
            </div>
          </div>

          {/* Faturas */}
          <div className="glass-card lg:col-span-3">
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Histórico de Faturas</h3>
            <div className="overflow-x-auto">
              {faturas.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">
                  Nenhuma fatura ainda. Faturas aparecerão aqui após o pagamento.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="pb-3 font-normal">Data</th>
                      <th className="pb-3 font-normal">Plano</th>
                      <th className="pb-3 font-normal">Período</th>
                      <th className="pb-3 font-normal">Valor</th>
                      <th className="pb-3 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {faturas.map((f) => (
                      <tr key={f.id} className="hover:bg-surface-2 transition-colors">
                        <td className="py-4 font-medium">{new Date(f.criado_em).toLocaleDateString('pt-BR')}</td>
                        <td className="py-4 text-muted">{f.plano_nome}</td>
                        <td className="py-4 text-muted">{f.periodo === 'anual' ? 'Anual' : 'Mensal'}</td>
                        <td className="py-4">R$ {parseFloat(f.valor).toFixed(2).replace('.', ',')}</td>
                        <td className="py-4">
                          <span className={`badge ${f.status === 'ativa' ? 'badge-success' : 'badge-warning'} text-[10px]`}>
                            {f.status === 'ativa' ? 'Ativo' : f.status === 'trial' ? 'Trial' : f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de planos */}
      <div id="plans-grid" className="text-center mb-10 pt-8 border-t border-border max-w-[1200px] mx-auto">
        <h3 className="text-2xl font-bold">
          {tenantStatus === 'trial' ? 'Escolha seu plano' : 'Fazer Upgrade'}
        </h3>
        <p className="text-sm text-muted">Desbloqueie todo o potencial do seu negócio.</p>
      </div>

      {planos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
          <p>Carregando planos...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1200px] mx-auto px-4">
          {planos.map((plan) => {
            const isCurrent = assinatura?.plano_nome === plan.nome && tenantStatus === 'ativo';
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
                  <div>
                    <h3 className="text-xl font-black">{plan.nome}</h3>
                    <p className="text-xs text-muted">{plan.max_usuarios} usuários · {plan.trial_dias}d trial</p>
                  </div>
                </div>

                <div className="mb-8">
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

                <div className="space-y-3 mb-10 flex-1">
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

      {/* Trust section */}
      <div className="mt-16 text-center">
        <div className="flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
          <div className="flex items-center gap-2"><ShieldCheck size={20}/> <span>Segurança SSL</span></div>
          <div className="flex items-center gap-2"><CreditCard size={20}/> <span>Mercado Pago</span></div>
          <div className="flex items-center gap-2"><Users size={20}/> <span>Suporte 24/7</span></div>
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
