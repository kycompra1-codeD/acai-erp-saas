import {
  ShoppingCart, Package, DollarSign, FileText, Users, BarChart2,
  Truck, UserCheck, Utensils, Globe, Shield, Smartphone,
} from 'lucide-react';

const MODULES = [
  { icon: ShoppingCart, title: 'PDV / Caixa', desc: 'Ponto de venda touch com suporte a balança, impressora térmica e múltiplos meios de pagamento.' },
  { icon: Package, title: 'Estoque', desc: 'Controle de movimentações, inventário, alertas de estoque mínimo e gestão por depósito.' },
  { icon: DollarSign, title: 'Financeiro', desc: 'Fluxo de caixa, contas a pagar e receber, DRE e conciliação bancária.' },
  { icon: FileText, title: 'Fiscal', desc: 'Emissão de NF-e, NFC-e e MDF-e. Configura CFOP, CST e tributos automaticamente.' },
  { icon: Users, title: 'CRM & Clientes', desc: 'Cadastro completo, histórico de compras, programa de fidelidade e cashback.' },
  { icon: Truck, title: 'Compras', desc: 'Pedidos de compra, recebimento de mercadoria, cotação com fornecedores e aprovações.' },
  { icon: UserCheck, title: 'Funcionários', desc: 'Controle de acesso por perfil, folha de ponto, comissões e KPIs por colaborador.' },
  { icon: BarChart2, title: 'BI & Relatórios', desc: 'Dashboards em tempo real com metas, ranking de produtos, ticket médio e tendências.' },
  { icon: Utensils, title: 'Cozinha (KDS)', desc: 'Tela de produção para restaurantes. Pedidos chegam em tempo real, status por etapa.' },
  { icon: Globe, title: 'Marketplaces', desc: 'Integração com iFood, Mercado Livre, Shopee, Shopify e outros canais de venda.' },
  { icon: Shield, title: 'Permissões', desc: '8 níveis de acesso: master, admin, gerente, caixa, estoque, financeiro e mais.' },
  { icon: Smartphone, title: 'Mobile / PWA', desc: 'Acesse de qualquer dispositivo. Instale como app no celular sem precisar de loja.' },
];

export default function Features() {
  return (
    <section id="funcionalidades" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
            Tudo que seu negócio precisa{' '}
            <span className="gradient-text">em um só lugar</span>
          </h2>
          <p className="text-[var(--text-muted)] max-w-xl mx-auto">
            Mais de 14 módulos integrados. Sem integrações caras, sem dados espalhados em planilhas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="glass rounded-xl p-5 hover:border-purple-500/30 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon size={18} color="#fff" />
              </div>
              <h3 className="font-bold text-sm mb-1">{title}</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
