import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Zap } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { differenceInDays, parseISO } from 'date-fns';

export default function TrialBanner() {
  const { empresa } = useAuth();
  const [fechado, setFechado] = useState(false);

  if (fechado) return null;
  if (!empresa || empresa.status !== 'trial') return null;

  const diasRestantes = empresa.trial_expira_em
    ? Math.max(0, differenceInDays(parseISO(empresa.trial_expira_em), new Date()))
    : null;

  const urgente = diasRestantes !== null && diasRestantes <= 3;
  const bg = urgente
    ? 'linear-gradient(90deg, #dc2626, #b91c1c)'
    : 'linear-gradient(90deg, #7c3aed, #4f46e5)';

  return (
    <div style={{
      background: bg,
      color: '#fff',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontSize: 13,
      fontWeight: 500,
      position: 'relative',
    }}>
      <Zap size={14} fill="currentColor" />
      <span>
        {diasRestantes !== null
          ? `Sua conta está no período gratuito. Restam ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}.`
          : 'Sua conta está no período gratuito.'}
        {' '}
        <Link to="/assinatura" style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>
          Assine agora
        </Link>
        {' '}para continuar usando após o trial.
      </span>
      <button
        onClick={() => setFechado(true)}
        style={{ position: 'absolute', right: 16, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, padding: 4 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
