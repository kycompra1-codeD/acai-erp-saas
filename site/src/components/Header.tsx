'use client';

import { useState } from 'react';
import { Menu, X, Zap } from 'lucide-react';
import Link from 'next/link';

const APP_URL = 'https://app.zullya.com.br';

const NAV = [
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Planos', href: '/planos' },
  { label: 'Contato', href: '#contato' },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/8 glass">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Zap size={16} color="#fff" fill="#fff" />
          </div>
          <span className="font-black text-lg tracking-tight">Zullya ERP</span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href={`${APP_URL}/login`}
            className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
          >
            Entrar
          </a>
          <a
            href={`${APP_URL}/registro`}
            className="px-4 py-2 rounded-lg gradient-bg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Teste grátis
          </a>
        </div>

        {/* Hamburger mobile */}
        <button
          className="md:hidden p-2 text-[var(--text-muted)]"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Menu mobile */}
      {open && (
        <div className="md:hidden border-t border-white/8 bg-[var(--surface)] px-4 py-4 flex flex-col gap-4">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm text-[var(--text-muted)] hover:text-white"
              onClick={() => setOpen(false)}
            >
              {n.label}
            </Link>
          ))}
          <hr className="border-white/8" />
          <a href={`${APP_URL}/login`} className="text-sm text-center text-[var(--text-muted)]">
            Entrar
          </a>
          <a
            href={`${APP_URL}/registro`}
            className="py-2 rounded-lg gradient-bg text-white text-sm font-semibold text-center"
          >
            Teste grátis 14 dias
          </a>
        </div>
      )}
    </header>
  );
}
