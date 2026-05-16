import type { Metadata } from 'next';
import Header from '@/components/Header';
import Pricing from '@/components/Pricing';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Planos e Preços — Zullya ERP',
  description:
    'Planos a partir de R$ 149/mês. Starter, Pro Business e Enterprise. 14 dias grátis, sem cartão.',
};

const FAQ = [
  {
    q: 'Preciso de cartão de crédito para o trial?',
    a: 'Não. Os 14 dias de teste são completamente gratuitos e sem necessidade de cadastrar cartão.',
  },
  {
    q: 'Posso mudar de plano depois?',
    a: 'Sim. Você pode fazer upgrade ou downgrade a qualquer momento pelo painel de assinaturas.',
  },
  {
    q: 'Meus dados ficam seguros?',
    a: 'Sim. Utilizamos PostgreSQL com backups diários automatizados, SSL em toda comunicação e servidores no Brasil.',
  },
  {
    q: 'Como funciona o suporte?',
    a: 'Starter tem suporte por e-mail. Pro Business tem suporte prioritário via chat. Enterprise tem gerente de conta dedicado.',
  },
  {
    q: 'Tenho mais de uma filial, como funciona?',
    a: 'O plano Pro Business e Enterprise suportam múltiplas filiais com dashboard centralizado. Entre em contato para cotação.',
  },
];

export default function PlanosPage() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <div className="text-center pt-16 pb-4 px-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
            Planos e <span className="gradient-text">Preços</span>
          </h1>
          <p className="text-[var(--text-muted)] max-w-lg mx-auto">
            Escolha o plano ideal para o tamanho do seu negócio. Sem taxa de setup, sem fidelidade.
          </p>
        </div>

        <Pricing />

        {/* FAQ */}
        <section className="py-16 px-4 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight text-center mb-10">
            Perguntas frequentes
          </h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="glass rounded-xl p-6">
                <h3 className="font-bold text-sm mb-2">{q}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
