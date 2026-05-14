import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grape, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ResetSenha() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !token) { toast.error('Link inválido. Solicite um novo.'); return; }
    if (senha.length < 8) { toast.error('A senha deve ter ao menos 8 caracteres'); return; }
    if (senha !== confirma) { toast.error('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      await authApi.redefinirSenha(email, token, senha);
      toast.success('Senha redefinida com sucesso!');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Token inválido ou expirado. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div className="animate-slide" style={{
        width: '100%', maxWidth: 400,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: 40,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div className="flex flex-col items-center" style={{ marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <Grape size={30} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Redefinir senha</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Crie uma nova senha para sua conta
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Seu e-mail</label>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nova senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input-field"
                type={showPass ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={{ paddingRight: 44 }}
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

          <div className="form-group">
            <label className="form-label">Confirmar nova senha</label>
            <input
              className="input-field"
              type="password"
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 20 }}>
          <span style={{ color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/login')}>
            Voltar ao login
          </span>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
