import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Zullya ERP — Sistema de Gestão Completo para o seu Negócio',
  description:
    'ERP SaaS completo com PDV, estoque, financeiro, fiscal, CRM e muito mais. Teste grátis por 14 dias. Sem cartão de crédito.',
  keywords: 'ERP, sistema de gestão, PDV, estoque, fiscal, NF-e, SaaS, Brasil',
  openGraph: {
    title: 'Zullya ERP — Gestão Completa do seu Negócio',
    description: 'ERP SaaS com PDV, estoque, financeiro e fiscal. Teste grátis 14 dias.',
    url: 'https://zullya.com.br',
    siteName: 'Zullya ERP',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zullya ERP',
    description: 'ERP SaaS completo. Teste grátis 14 dias.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://zullya.com.br' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
