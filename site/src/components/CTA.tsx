import { ArrowRight } from 'lucide-react';

const APP_URL = 'https://app.zullya.com.br';

export default function CTA() {
  return (
    <section id="contato" className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <div
          className="rounded-3xl p-10 md:p-16 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(244,114,182,0.15) 100%)',
            border: '1px solid rgba(124,58,237,0.3)',
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none rounded-3xl"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
              Pronto para ter controle{' '}
              <span className="gradient-text">de verdade?</span>
            </h2>
            <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">
              Comece agora. Configure em minutos, importe seus produtos e venda no mesmo dia.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`${APP_URL}/registro`}
                className="flex items-center gap-2 px-8 py-4 rounded-xl gradient-bg text-white font-bold hover:opacity-90 transition-opacity"
              >
                Criar conta gratuita
                <ArrowRight size={18} />
              </a>
              <a
                href="mailto:contato@zullya.com.br"
                className="px-6 py-4 rounded-xl glass text-sm font-semibold text-[var(--text-muted)] hover:text-white transition-colors"
              >
                Falar com a equipe
              </a>
            </div>

            <p className="mt-4 text-xs text-[var(--text-muted)]">
              14 dias grátis · Sem cartão · Suporte em português
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
