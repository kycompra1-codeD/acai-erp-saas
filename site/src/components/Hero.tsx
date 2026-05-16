import { ArrowRight, CheckCircle } from 'lucide-react';

const APP_URL = 'https://app.zullya.com.br';

const BULLETS = [
  'PDV completo com balança e impressora',
  'Estoque, compras e fornecedores',
  'Financeiro, DRE e fluxo de caixa',
  'Emissor NF-e / NFC-e integrado',
];

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Glow de fundo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.25) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-semibold text-[var(--primary-light)] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Mais de 14 módulos integrados — um sistema, zero planilha
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-6">
          Gerencie seu negócio{' '}
          <span className="gradient-text">do caixa à estratégia</span>
        </h1>

        <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
          ERP SaaS completo para empresas que precisam de controle real. PDV, estoque,
          financeiro, fiscal e relatórios em uma única plataforma.
        </p>

        {/* Bullets */}
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10">
          {BULLETS.map(b => (
            <li key={b} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <CheckCircle size={14} className="text-[var(--primary-light)] shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={`${APP_URL}/registro`}
            className="flex items-center gap-2 px-8 py-4 rounded-xl gradient-bg text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-purple-900/30"
          >
            Começar grátis por 14 dias
            <ArrowRight size={18} />
          </a>
          <a
            href="#funcionalidades"
            className="px-6 py-4 rounded-xl glass text-sm font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Ver funcionalidades
          </a>
        </div>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Sem cartão de crédito · Cancele quando quiser · Setup em minutos
        </p>
      </div>
    </section>
  );
}
