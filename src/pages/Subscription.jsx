import { useState } from 'react';
import { 
  Check, 
  Zap, 
  Crown, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Globe,
  Truck,
  Users,
  CreditCard,
  FileText
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import CheckoutModal from '../components/CheckoutModal';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 149,
    description: 'Para quem está começando e busca profissionalizar as vendas.',
    icon: Zap,
    color: 'var(--text-muted)',
    features: [
      { text: 'PDV Completo (Touch)', included: true },
      { text: 'Controle de Estoque Base', included: true },
      { text: 'Relatórios Diários', included: true },
      { text: 'Até 2 Usuários', included: true },
      { text: 'Integração iFood (1 loja)', included: true },
      { text: 'DRE Financeiro', included: false },
      { text: 'Emissor NF-e/NFC-e', included: false },
      { text: 'B.I. Avançado', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro Business',
    price: 297,
    recommended: true,
    description: 'O ecossistema completo para gestão profissional e crescimento.',
    icon: Crown,
    color: 'var(--primary-light)',
    features: [
      { text: 'PDV Multicaixa', included: true },
      { text: 'Gestão Multidepósito', included: true },
      { text: 'B.I. & DRE Avançado', included: true },
      { text: 'Usuários Ilimitados', included: true },
      { text: 'Hub Marketplace Completo', included: true },
      { text: 'Emissor Fiscal Ilimitado', included: true },
      { text: 'CRM & Funil de Vendas', included: true },
      { text: 'Suporte Prioritário', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 597,
    description: 'Soluções customizadas para redes e franquias de açaí.',
    icon: ShieldCheck,
    color: 'var(--accent)',
    features: [
      { text: 'Tudo do plano Pro', included: true },
      { text: 'Gestão de Franquias', included: true },
      { text: 'API Aberta (Webhooks)', included: true },
      { text: 'White Label Parcial', included: true },
      { text: 'A.I. Engine Auditoria', included: true },
      { text: 'Dashboard Centralizado', included: true },
      { text: 'Gerente de Conta', included: true },
      { text: 'SLA de Atendimento', included: true },
    ],
  },
];

export default function Subscription() {
  const { settings, updateSettings } = useApp();
  const currentPlanId = settings?.planId || 'pro'; // Demo default
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleUpgrade = (plan) => {
    if (plan.id === currentPlanId) {
      toast('Você já está neste plano!', { icon: 'ℹ️' });
      return;
    }
    
    // Open checkout modal
    setSelectedPlan(plan);
  };

  const handleCheckoutSuccess = (planId) => {
    setSelectedPlan(null);
    if (updateSettings) {
      updateSettings({ planId });
      toast.success(`Assinatura atualizada com sucesso!`);
    }
  };

  return (
    <div className="animate-fade pb-12">
      {/* Header / Dashboard Section */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold mb-4">Gestão de Assinatura</h2>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            Acompanhe seu uso, histórico de faturas e gerencie seu plano atual.
          </p>
        </div>

        {currentPlanId && (
          <div className="max-w-[1200px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Plan Card */}
            <div className="glass-card lg:col-span-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10" />
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Plano Atual</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-primary-light">
                      {PLANS.find(p => p.id === currentPlanId)?.name || currentPlanId.toUpperCase()}
                    </span>
                    <span className="badge badge-success">Ativo</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted">Próxima renovação em</div>
                  <div className="font-bold">15 de Junho, 2026</div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button className="btn btn-outline" onClick={() => document.getElementById('plans-grid').scrollIntoView({behavior: 'smooth'})}>
                  Alterar Plano
                </button>
                <button className="btn btn-ghost text-danger hover:bg-danger/10">
                  Cancelar Assinatura
                </button>
              </div>
            </div>

            {/* Billing Method Card */}
            <div className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Método de Pagamento</h3>
                  <CreditCard size={18} className="text-primary-light" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border">
                  <div className="w-10 h-6 bg-white rounded border border-gray-200 flex items-center justify-center">
                    <span className="text-[10px] font-black text-blue-800 italic">VISA</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold">•••• •••• •••• 4242</div>
                    <div className="text-[10px] text-muted">Expira em 12/28</div>
                  </div>
                </div>
              </div>
              <button className="text-xs text-primary font-bold mt-4 text-left hover:underline">
                Atualizar Método de Pagamento
              </button>
            </div>

            {/* Invoices List */}
            <div className="glass-card lg:col-span-3">
               <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Histórico de Faturas</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead>
                     <tr className="border-b border-border text-muted">
                       <th className="pb-3 font-normal">Data</th>
                       <th className="pb-3 font-normal">Plano</th>
                       <th className="pb-3 font-normal">Valor</th>
                       <th className="pb-3 font-normal">Status</th>
                       <th className="pb-3 font-normal text-right">Recibo</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                     {[
                       { date: '15 Mai, 2026', plan: 'Pro Business', amount: 'R$ 297,00', status: 'pago' },
                       { date: '15 Abr, 2026', plan: 'Pro Business', amount: 'R$ 297,00', status: 'pago' },
                       { date: '15 Mar, 2026', plan: 'Pro Business', amount: 'R$ 297,00', status: 'pago' }
                     ].map((inv, i) => (
                       <tr key={i} className="hover:bg-surface-2 transition-colors">
                         <td className="py-4 font-medium">{inv.date}</td>
                         <td className="py-4 text-muted">{inv.plan}</td>
                         <td className="py-4">{inv.amount}</td>
                         <td className="py-4">
                           <span className="badge badge-success text-[10px]">Pago</span>
                         </td>
                         <td className="py-4 text-right">
                           <button className="text-primary hover:underline text-xs font-bold flex items-center gap-1 justify-end ml-auto">
                             <FileText size={14} /> PDF
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Plans Grid Header */}
      <div id="plans-grid" className="text-center mb-10 pt-8 border-t border-border max-w-[1200px] mx-auto">
         <h3 className="text-2xl font-bold">Faça um Upgrade</h3>
         <p className="text-sm text-muted">Desbloqueie todo o potencial do seu negócio.</p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1200px] mx-auto px-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const Icon = plan.icon;

          return (
            <div 
              key={plan.id} 
              className={`glass-card flex flex-col relative transition-all duration-300 hover-lift ${plan.recommended ? 'border-primary ring-1 ring-primary/30 scale-105 z-10' : ''}`}
              style={{ padding: '40px 32px' }}
            >
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-lg">
                  Mais Popular
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div style={{ 
                  width: 56, height: 56, borderRadius: 16, 
                  background: 'var(--surface-2)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center',
                  color: plan.color, border: '1px solid var(--border)'
                }}>
                  <Icon size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{plan.name}</h3>
                  <p className="text-xs text-muted">Acesso Ilimitado</p>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-muted">R$</span>
                  <span className="text-5xl font-black">{plan.price}</span>
                  <span className="text-sm font-bold text-muted">/mês</span>
                </div>
                <p className="text-sm text-muted mt-4 leading-relaxed h-[40px]">
                  {plan.description}
                </p>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className={`flex items-center gap-3 text-sm ${feature.included ? 'text-text' : 'text-muted opacity-40'}`}>
                    {feature.included ? (
                      <Check size={16} className="text-success shrink-0" />
                    ) : (
                      <ArrowRight size={16} className="shrink-0" />
                    )}
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>

              <button 
                className={`btn btn-lg w-full font-black tracking-tight ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => handleUpgrade(plan)}
              >
                {isCurrent ? 'Plano Atual' : 'Migrar Agora'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparison Section */}
      <div className="mt-24 max-w-[1000px] mx-auto">
        <div className="glass-card overflow-hidden">
          <div className="p-8 border-b border-border bg-surface-2">
            <h4 className="text-xl font-bold">Por que o Plano Pro é o ideal?</h4>
            <p className="text-sm text-muted">O Plano Pro Business foi desenhado por donos de açaí para donos de açaí.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-border">
            {[
              { label: 'Marketplace Hub', desc: 'Sincronize com iFood e ML.', icon: Globe },
              { label: 'Logística', desc: 'Gestão de entregas real.', icon: Truck },
              { label: 'Financeiro', desc: 'DRE e fluxo de caixa.', icon: TrendingUp },
              { label: 'Fiscal', desc: 'NFe e NFCe sem limites.', icon: FileText },
            ].map((item, i) => (
              <div key={i} className="p-6 hover:bg-surface-2 transition-colors">
                <item.icon className="text-primary-light mb-3" size={20} />
                <div className="text-sm font-bold mb-1">{item.label}</div>
                <div className="text-[11px] text-muted">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ / Trust Section */}
      <div className="mt-16 text-center">
        <div className="flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
          <div className="flex items-center gap-2"><ShieldCheck size={20}/> <span>Segurança SSL</span></div>
          <div className="flex items-center gap-2"><CreditCard size={20}/> <span>Checkout Seguro</span></div>
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
