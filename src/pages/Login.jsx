import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grape, Eye, EyeOff, Loader2, Shield, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, backendOnline } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result?.sucesso) {
        if (result?.demo) {
          toast.success('Bem-vindo ao modo Demo! 🍇', { icon: '🎭' });
        } else {
          toast.success('Bem-vindo ao Açaí ERP! 🍇');
        }
        navigate('/');
      } else {
        toast.error(result?.mensagem || 'Email ou senha incorretos');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const entrarDemo = async () => {
    setLoading(true);
    const result = await login('admin@demo.com', 'demo');
    if (result?.sucesso) {
      toast.success('Modo demonstração ativado 🎭');
      navigate('/');
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
        {/* Status do backend */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px',
          borderRadius: 'var(--radius)',
          background: backendOnline ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
          marginBottom: 24, fontSize: 11,
          color: backendOnline ? '#10b981' : '#f59e0b',
        }}>
          {backendOnline
            ? <><Wifi size={12} /> API Online — login real ativado</>
            : <><WifiOff size={12} /> API Offline — use o modo Demo</>
          }
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center" style={{ marginBottom: 32 }}>
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
              placeholder="seu@email.com.br"
              autoComplete="email"
              autoFocus
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

        {/* Separador */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          margin: '20px 0', color: 'var(--text-muted)', fontSize: 11,
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          ou
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* Botão demo */}
        <button
          type="button"
          onClick={entrarDemo}
          disabled={loading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: 'var(--text-muted)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Shield size={14} />
          Entrar no Modo Demo (sem cadastro)
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          Não tem conta?{' '}
          <span
            style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => toast('Cadastro em breve! Por enquanto use o modo Demo.', { icon: '🚀' })}
          >
            Criar conta grátis
          </span>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
