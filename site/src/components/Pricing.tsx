import { Check, X, Zap, Crown, Shield } from 'lucide-react';
import Link from 'next/link';

const APP_URL = 'https://app.zullya.com.br';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 149,
    description: 'Para quem está começando e busca profissionalizar as vendas.',
    Icon: Zap,
    features: [
      { text: 'PDV Completo (Touch)', ok: true },
      { text: 'Controle de Estoque Base', ok: true },
      { text: 'Relatórios Diários', ok: true },
      { text: 'Até 2 Usuários', ok: true },
      { text: 'Integração iFood (1 loja)', ok: true },
      { text: 'DRE Financeiro', ok: false },
      { text: 'Emissor NF-e/NFC-e', ok: false },
      { text: 'BI Avançado', ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro Business',
    price: 297,
    recommended: true,
    description: 'O ecossistema completo para gestão profissional e crescimento.',
    Icon: Crown,
    features: [
      { text: 'PDV Multicaixa', ok: true },
      { text: 'Gestão Multidepósito', ok: true },
      { text: 'BI & DRE Avançado', ok: true },
      { text: 'Usuários Ilimitados', ok: true },
      { text: 'Hub Marketplace Completo', ok: true },
      { text: 'Emissor Fiscal Ilimitado', ok: true },
      { text: 'CRM & Funil de Vendas', ok: true },
      { text: 'Suporte Prioritário', ok: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 597,
    description: 'Soluções customizadas para redes e franquias.',
    Icon: Shield,
    features: [
      { text: 'Tudo do plano Pro', ok: true },
      { text: 'Gestão de Franquias', ok: true },
      { text: 'API Aberta (Webhooks)', ok: true },
      { text: 'White Label Parcial', ok: true },
      { text: 'AI Engine de Auditoria', ok: true },
      { text: 'Dashboard Centralizado', ok: true },
      { text: 'Gerente de Conta', ok: true },
      { text: 'SLA de Atendimento', ok: true },
    ],
  },
];

export default function Pricing({ compact = false }: { compact?: boolean }) {
  return (
    <section id="planos" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        {!compact && (
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
              Planos para cada <span className="gradient-text">fase do negócio</span>
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              Comece no Starter e escale quando precisar. Sem taxa de setup, sem fidelidade.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(({ id, name, price, description, Icon, features, recommended }) => (
            <div
              key={id}
              className={`rounded-2xl p-6 flex flex-col relative ${
                recommended
                  ? 'border-2 border-purple-500 bg-[var(--surface)]'
                  : 'glass'
              }`}
            >
              {recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-white text-xs font-bold whitespace-nowrap">
                  Mais popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
                  <Icon size={16} color="#fff" />
                </div>
                <span className="font-bold">{name}</span>
              </div>

              <div className="mb-2">
                <span className="text-4xl font-black">R$ {price}</span>
                <span className="text-[var(--text-muted)] text-sm">/mês</span>
              </div>

              <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">{description}</p>

              <ul className="flex-1 space-y-2.5 mb-6">
                {features.map(f => (
                  <li key={f.text} className="flex items-center gap-2 text-sm">
                    {f.ok ? (
                      <Check size={14} className="text-[var(--primary-light)] shrink-0" />
                    ) : (
                      <X size={14} className="text-[var(--text-muted)] shrink-0 opacity-40" />
                    )}
                    <span className={f.ok ? '' : 'text-[var(--text-muted)] opacity-50'}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={`${APP_URL}/registro?plano=${id}`}
                className={`w-full py-3 rounded-xl text-sm font-bold text-center transition-opacity ${
                  recommended
                    ? 'gradient-bg text-white hover:opacity-90'
                    : 'glass hover:border-purple-500/30 text-[var(--text-muted)] hover:text-white'
                }`}
              >
                Testar grátis por 14 dias
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          Todos os planos incluem 14 dias gratuitos · Sem cartão de crédito · Cancele quando quiser
        </p>

        {compact && (
          <div className="text-center mt-8">
            <Link href="/planos" className="text-sm text-[var(--primary-light)] hover:underline">
              Ver comparativo completo de planos →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
