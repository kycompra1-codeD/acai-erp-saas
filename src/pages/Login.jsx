import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grape, Eye, EyeOff, Loader2, ChefHat, ShoppingCart, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_USERS } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ROLE_ICONS = {
  admin:    { icon: Shield,       color: '#7c3aed', label: 'Administrador' },
  caixa:    { icon: ShoppingCart, color: '#ec4899', label: 'Operador de Caixa' },
  producao: { icon: ChefHat,      color: '#f59e0b', label: 'Produção' },
};

export default function Login() {
  const [email, setEmail] = useState('admin@acaibom.com.br');
  const [password, setPassword] = useState('admin123');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const ok = login(email, password);
    if (ok) {
      toast.success('Bem-vindo ao Açaí ERP SaaS! 🍇');
      navigate('/');
    } else {
      toast.error('Credenciais inválidas');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
        top: -200, left: -200,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
        bottom: -100, right: -100,
        pointerEvents: 'none',
      }} />

      <div className="animate-slide" style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: 40,
        boxShadow: 'var(--shadow-lg)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div className="flex flex-col items-center" style={{ marginBottom: 36 }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: 'var(--shadow-primary)',
          }}>
            <Grape size={36} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span className="gradient-text">Açaí ERP SaaS</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
            Sistema de Gestão
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@acaibom.com.br"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 44 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Demo users */}
        <div style={{ marginTop: 20 }}>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            💡 Acesso rápido (clique para preencher)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {DEMO_USERS.map(u => {
              const ri = ROLE_ICONS[u.role] || ROLE_ICONS.admin;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(u.password); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = ri.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `${ri.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ri.icon size={14} color={ri.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{ri.label} · {u.email}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
