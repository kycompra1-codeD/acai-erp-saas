import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Registro() {
  const navigate = useNavigate();
  const { registro } = useAuth();

  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmarSenha: '', nome_empresa: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.senha !== form.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (form.senha.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      const result = await registro({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        nome_empresa: form.nome_empresa,
      });
      if (result.sucesso) {
        toast.success('Conta criada! Bem-vindo ao Zullya ERP.');
        navigate('/');
      } else {
        toast.error(result.mensagem || 'Erro ao criar conta');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text)', fontSize: 14, outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--background)', padding: 16,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 900, color: '#fff',
          }}>Z</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>
            Comece grátis por 14 dias
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
            Sem cartão de crédito necessário
          </p>
        </div>

        {/* Benefits */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 24,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {['14 dias gratuitos, sem compromisso', 'Todos os módulos liberados no trial', 'Suporte incluso durante o período'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)' }}>
              <CheckCircle size={15} color="#22c55e" />
              {t}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Nome completo
            </label>
            <input style={inputStyle} type="text" value={form.nome} onChange={set('nome')}
              placeholder="Seu nome" required autoFocus />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Nome da empresa
            </label>
            <input style={inputStyle} type="text" value={form.nome_empresa} onChange={set('nome_empresa')}
              placeholder="Minha Empresa Ltda" required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              E-mail
            </label>
            <input style={inputStyle} type="email" value={form.email} onChange={set('email')}
              placeholder="voce@empresa.com" required />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input style={{ ...inputStyle, paddingRight: 44 }}
                type={showPass ? 'text' : 'password'} value={form.senha} onChange={set('senha')}
                placeholder="Mínimo 8 caracteres" required minLength={8} />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
              }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Confirmar senha
            </label>
            <input style={inputStyle} type={showPass ? 'text' : 'password'}
              value={form.confirmarSenha} onChange={set('confirmarSenha')}
              placeholder="Repita a senha" required />
          </div>

          <button type="submit" disabled={loading} style={{
            marginTop: 4, padding: '12px 0',
            background: loading ? 'var(--border)' : 'linear-gradient(135deg, #7c3aed, #db2777)',
            border: 'none', borderRadius: 8, color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {loading ? 'Criando conta...' : 'Criar conta grátis'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Entrar</Link>
          </p>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 16 }}>
          Ao criar sua conta você concorda com os{' '}
          <a href="#" style={{ color: 'var(--primary)' }}>Termos de Uso</a>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
