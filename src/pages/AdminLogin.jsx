import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkBackend } from '../services/api';

const API = import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);
  const navigate = useNavigate();

  // Verificar estado do backend
  useEffect(() => {
    const check = async () => {
      const online = await checkBackend();
      setBackendOnline(online);
    };
    check();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!data.sucesso) {
        toast.error(data.mensagem || 'Credenciais inválidas');
        return;
      }
      localStorage.setItem('zullya_admin_token', data.dados.token);
      localStorage.setItem('zullya_admin', JSON.stringify(data.dados.admin));
      navigate('/admin');
    } catch {
      toast.error('Servidor indisponível. Verifique se a API na VPS está ativa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f10',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: '#1a1a1f',
        border: '1px solid #2d2d35',
        borderRadius: 16, padding: 40,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Shield size={28} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Painel Admin</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Zullya ERP — Acesso restrito</p>
        </div>

        {/* Alerta de Servidor Offline */}
        {!backendOnline && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'flex-start', gap: 10
          }}>
            <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 2 }}>Servidor da VPS Off-line</p>
              <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
                Não foi possível conectar com o servidor da API. Verifique sua conexão ou se a API na VPS está ativa.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@zullya.com.br"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#0f0f10', border: '1px solid #2d2d35',
                borderRadius: 8, padding: '10px 14px',
                color: '#fff', fontSize: 14, outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#9ca3af', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0f0f10', border: '1px solid #2d2d35',
                  borderRadius: 8, padding: '10px 44px 10px 14px',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8, padding: '11px 0',
              background: loading ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #db2777)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .hover-bg-primary:hover {
          background: rgba(124, 58, 237, 0.2) !important;
          color: #fff !important;
        }
      `}</style>
    </div>
  );
}
