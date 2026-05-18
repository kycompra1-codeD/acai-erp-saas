import { Link } from 'react-router-dom';
import { Lock, ArrowUpRight } from 'lucide-react';
import { usePlanoLimites } from '../hooks/usePlanoLimites';

export function ModuloLocked({ modulo, children }) {
  const { temModulo, planoNome } = usePlanoLimites();

  if (temModulo(modulo)) return children;

  return (
    <div style={{ position: 'relative', minHeight: 400 }}>
      <div style={{ pointerEvents: 'none', opacity: 0.15, filter: 'blur(3px)', userSelect: 'none' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,15,26,0.85)',
        backdropFilter: 'blur(4px)',
        borderRadius: 16, gap: 16,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(124,58,237,0.15)',
          border: '1px solid rgba(124,58,237,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={28} color="var(--primary-light)" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
            Módulo bloqueado
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 320, lineHeight: 1.6 }}>
            Este recurso não está disponível no plano <strong>{planoNome}</strong>.
            Faça upgrade para desbloquear.
          </p>
        </div>
        <Link
          to="/assinatura"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#fff', textDecoration: 'none',
            borderRadius: 10, fontWeight: 700, fontSize: 14,
            boxShadow: 'var(--shadow-primary)',
          }}
        >
          <ArrowUpRight size={16} />
          Ver Planos e Fazer Upgrade
        </Link>
      </div>
    </div>
  );
}
