import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grape, Eye, EyeOff, Loader2, Wifi, WifiOff, X } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  // Modal de completar cadastro via Google
  const [googleCadastro, setGoogleCadastro] = useState(null); // { google_id, email, nome, avatar_url }
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginGoogle, registroGoogle, backendOnline } = useAuth();
  const navigate = useNavigate();

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await authApi.esqueciSenha(forgotEmail);
      toast.success('Se o e-mail estiver cadastrado, você receberá as instruções em breve.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch {
      toast.success('Se o e-mail estiver cadastrado, você receberá as instruções em breve.');
      setForgotOpen(false);
    } finally {
      setForgotLoading(false);
    }
  };

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
        toast.success('Bem-vindo ao Zullya ERP!');
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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const result = await loginGoogle(credentialResponse.credential);
      if (result?.precisa_completar_cadastro) {
        setGoogleCadastro(result.google_dados);
      } else if (result?.sucesso) {
        toast.success('Bem-vindo ao Zullya ERP!');
        navigate('/');
      } else {
        const msg = result?.mensagem || 'Erro ao entrar com Google. Tente novamente.';
        toast.error(msg, { duration: 5000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCadastro = async (e) => {
    e.preventDefault();
    if (!nomeEmpresa.trim()) { toast.error('Informe o nome da sua empresa'); return; }
    setGoogleLoading(true);
    try {
      const result = await registroGoogle({ ...googleCadastro, nome_empresa: nomeEmpresa });
      if (result?.sucesso) {
        toast.success('Conta criada! Seu trial de 14 dias começou.');
        navigate('/');
      } else {
        toast.error(result?.mensagem || 'Erro ao criar conta');
      }
    } finally {
      setGoogleLoading(false);
    }
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
          background: backendOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${backendOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          marginBottom: 24, fontSize: 11,
          color: backendOnline ? '#10b981' : '#ef4444',
        }}>
          {backendOnline
            ? <><Wifi size={12} /> API Online — login real ativado</>
            : <><WifiOff size={12} /> Servidor Offline — login temporariamente indisponível</>
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
            <span className="gradient-text">Zullya ERP</span>
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
            <div className="flex items-center justify-between">
              <label className="form-label">Senha</label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--primary-light)', padding: 0 }}
              >
                Esqueci minha senha
              </button>
            </div>
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

        {/* Botão Google */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Erro ao entrar com Google')}
            text="signin_with"
            shape="rectangular"
            theme="outline"
            locale="pt-BR"
            width="320"
          />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 20 }}>
          Não tem conta?{' '}
          <a href="/registro" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Testar 14 dias grátis
          </a>
        </p>
      </div>

      {/* Modal: Completar cadastro Google */}
      {googleCadastro && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', padding: 32, width: '100%', maxWidth: 400,
            position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              {googleCadastro.avatar_url && (
                <img src={googleCadastro.avatar_url} alt="" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              )}
              <div>
                <p style={{ fontWeight: 700, fontSize: 16 }}>Olá, {googleCadastro.nome}!</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{googleCadastro.email}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Só falta uma coisa: qual é o nome da sua empresa?
            </p>
            <form onSubmit={handleGoogleCadastro} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input-field"
                type="text"
                value={nomeEmpresa}
                onChange={e => setNomeEmpresa(e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
                autoFocus
              />
              <button type="submit" className="btn btn-primary" disabled={googleLoading || !nomeEmpresa.trim()}>
                {googleLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {googleLoading ? 'Criando conta...' : 'Criar conta grátis — 14 dias de trial'}
              </button>
              <button
                type="button"
                onClick={() => setGoogleCadastro(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Esqueci minha senha */}
      {forgotOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16,
        }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)', padding: 32, width: '100%', maxWidth: 380,
            position: 'relative',
          }}>
            <button
              onClick={() => { setForgotOpen(false); setForgotEmail(''); }}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Recuperar senha</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
            </p>
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="input-field"
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="seu@email.com.br"
                autoFocus
              />
              <button type="submit" className="btn btn-primary" disabled={forgotLoading || !forgotEmail}>
                {forgotLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {forgotLoading ? 'Enviando...' : 'Enviar instruções'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
