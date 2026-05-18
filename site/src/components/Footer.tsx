import { Zap } from 'lucide-react';
import Link from 'next/link';

const APP_URL = 'https://app.zullya.com.br';

const LINKS = {
  Produto: [
    { label: 'Funcionalidades', href: '/#funcionalidades' },
    { label: 'Planos', href: '/planos' },
    { label: 'Changelog', href: '#' },
  ],
  Empresa: [
    { label: 'Sobre', href: '#' },
    { label: 'Contato', href: 'mailto:contato@zullya.com.br' },
    { label: 'Status', href: '#' },
  ],
  Legal: [
    { label: 'Privacidade', href: '/privacidade' },
    { label: 'Termos de uso', href: '/termos' },
    { label: 'LGPD', href: '/lgpd' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/8 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center">
                <Zap size={14} color="#fff" fill="#fff" />
              </div>
              <span className="font-black tracking-tight">Zullya ERP</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[180px]">
              ERP SaaS completo para empresas brasileiras que querem crescer com controle.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">
                {group}
              </p>
              <ul className="space-y-2.5">
                {items.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/8">
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Zullya ERP. Todos os direitos reservados.
          </p>
          <a
            href={`${APP_URL}/login`}
            className="text-xs text-[var(--primary-light)] hover:underline"
          >
            Acessar o sistema →
          </a>
        </div>
      </div>
    </footer>
  );
}
