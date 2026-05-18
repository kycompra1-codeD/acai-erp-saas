import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, AlertCircle, CheckCircle, Clock,
  LogOut, Search, RefreshCw, ChevronDown, X, Save,
  Gift, Ban, Edit3, BarChart2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'https://api.zullya.com.br/api';

function adminFetch(path, options = {}) {
  const token = localStorage.getItem('zullya_admin_token');
  return fetch(`${API}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  }).then(async r => {
    const data = await r.json();
    if (r.status === 401) {
      localStorage.removeItem('zullya_admin_token');
      window.location.href = '/admin/login';
    }
    return data;
  });
}

const STATUS_COLOR = {
  trial:       { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b',  label: 'Trial' },
  ativo:       { bg: 'rgba(16,185,129,0.15)',  text: '#10b981',  label: 'Ativo' },
  inadimplente:{ bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  label: 'Inadimplente' },
  suspenso:    { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  label: 'Suspenso' },
  cancelado:   { bg: 'rgba(107,114,128,0.15)', text: '#6b7280',  label: 'Cancelado' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.cancelado;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px',
      background: s.bg, color: s.text,
      borderRadius: 20, fontSize: 11, fontWeight: 700,
    }}>
      {s.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: '#1a1a1f', border: '1px solid #2d2d35',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>{label}</p>
        <p style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{value}</p>
      </div>
    </div>
  );
}

function ClienteModal({ tenant, planos, onClose, onSave }) {
  const [status, setStatus] = useState(tenant.status);
  const [planoId, setPlanoId] = useState(tenant.plano_id || '');
  const [desconto, setDesconto] = useState(tenant.desconto_percentual || 0);
  const [gratuito, setGratuito] = useState(tenant.acesso_gratuito || false);
  const [notas, setNotas] = useState(tenant.notas_internas || '');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        adminFetch(`/tenants/${tenant.id}/status`, { method: 'PATCH', body: JSON.stringify({ status, motivo }) }),
        planoId && adminFetch(`/tenants/${tenant.id}/plano`, { method: 'PATCH', body: JSON.stringify({ plano_id: planoId }) }),
        adminFetch(`/tenants/${tenant.id}/desconto`, { method: 'PATCH', body: JSON.stringify({ desconto_percentual: parseFloat(desconto) }) }),
        adminFetch(`/tenants/${tenant.id}/acesso-gratuito`, { method: 'PATCH', body: JSON.stringify({ acesso_gratuito: gratuito }) }),
        adminFetch(`/tenants/${tenant.id}/notas`, { method: 'PATCH', body: JSON.stringify({ notas_internas: notas }) }),
      ]);
      toast.success('Cliente atualizado!');
      onSave();
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: 16,
    }}>
      <div style={{
        background: '#1a1a1f', border: '1px solid #2d2d35',
        borderRadius: 16, padding: 32, width: '100%', maxWidth: 540,
        maxHeight: '90vh', overflowY: 'auto',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
        }}>
          <X size={20} />
        </button>

        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          {tenant.nome_empresa}
        </h2>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>{tenant.email_contato}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Status */}
          <div>
            <label style={labelStyle}>Status da conta</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="trial">Trial</option>
              <option value="ativo">Ativo</option>
              <option value="inadimplente">Inadimplente</option>
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {['inadimplente', 'suspenso', 'cancelado'].includes(status) && (
            <div>
              <label style={labelStyle}>Motivo do bloqueio</label>
              <input
                type="text"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ex: Fatura vencida há 30 dias"
                style={inputStyle}
              />
            </div>
          )}

          {/* Plano */}
          <div>
            <label style={labelStyle}>Plano</label>
            <select value={planoId} onChange={e => setPlanoId(e.target.value)} style={inputStyle}>
              <option value="">Sem plano</option>
              {planos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {parseFloat(p.valor_mensal).toFixed(2)}/mês ({p.max_usuarios} usuários)
                </option>
              ))}
            </select>
          </div>

          {/* Desconto */}
          <div>
            <label style={labelStyle}>Desconto individual (%)</label>
            <input
              type="number" min="0" max="100" step="5"
              value={desconto}
              onChange={e => setDesconto(e.target.value)}
              style={inputStyle}
            />
            <p style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
              {desconto > 0 ? `Cliente paga ${100 - desconto}% do valor do plano` : 'Sem desconto aplicado'}
            </p>
          </div>

          {/* Acesso gratuito */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 600 }}>Acesso gratuito</p>
              <p style={{ color: '#6b7280', fontSize: 12 }}>Mantém acesso sem cobrar</p>
            </div>
            <button
              onClick={() => setGratuito(v => !v)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: gratuito ? '#7c3aed' : '#374151',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <span style={{
                position: 'absolute', width: 18, height: 18, borderRadius: '50%',
                background: '#fff', top: 3,
                left: gratuito ? 22 : 4,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {/* Notas internas */}
          <div>
            <label style={labelStyle}>Notas internas (só você vê)</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Anotações sobre este cliente..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          {/* Info */}
          <div style={{ background: '#0f0f10', borderRadius: 8, padding: 12, fontSize: 12, color: '#6b7280' }}>
            <p>Usuários: <strong style={{ color: '#e5e7eb' }}>{tenant.total_usuarios}</strong></p>
            <p>Cadastrado: <strong style={{ color: '#e5e7eb' }}>{new Date(tenant.criado_em).toLocaleDateString('pt-BR')}</strong></p>
            {tenant.trial_expira_em && (
              <p>Trial expira: <strong style={{ color: '#f59e0b' }}>{new Date(tenant.trial_expira_em).toLocaleDateString('pt-BR')}</strong></p>
            )}
          </div>

          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: '12px 0',
              background: saving ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #db2777)',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', color: '#9ca3af', fontSize: 12, fontWeight: 600, marginBottom: 6 };
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#0f0f10', border: '1px solid #2d2d35',
  borderRadius: 8, padding: '10px 12px',
  color: '#fff', fontSize: 14, outline: 'none',
};

export default function AdminPanel() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('zullya_admin') || '{}');

  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [aba, setAba] = useState('clientes');

  const carregarStats = useCallback(async () => {
    const data = await adminFetch('/stats');
    if (data.sucesso) setStats(data.dados);
  }, []);

  const carregarTenants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (busca) params.set('busca', busca);
    if (filtroStatus) params.set('status', filtroStatus);
    const data = await adminFetch(`/tenants?${params}`);
    if (data.sucesso) { setTenants(data.dados); setTotal(data.total); }
    setLoading(false);
  }, [busca, filtroStatus]);

  const carregarPlanos = useCallback(async () => {
    const data = await adminFetch('/planos');
    if (data.sucesso) setPlanos(data.dados);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('zullya_admin_token');
    if (!token) { navigate('/admin/login'); return; }
    carregarStats();
    carregarTenants();
    carregarPlanos();
  }, [navigate, carregarStats, carregarTenants, carregarPlanos]);

  const logout = () => {
    localStorage.removeItem('zullya_admin_token');
    localStorage.removeItem('zullya_admin');
    navigate('/admin/login');
  };

  const mrr = stats ? `R$ ${parseFloat(stats.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f10', color: '#e5e7eb' }}>
      {/* Header */}
      <div style={{
        background: '#1a1a1f', borderBottom: '1px solid #2d2d35',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Zullya Admin</p>
            <p style={{ fontSize: 11, color: '#6b7280' }}>Painel de gestão da plataforma</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Olá, {admin.nome || 'Admin'}</p>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid #2d2d35',
            borderRadius: 8, padding: '6px 12px',
            color: '#9ca3af', cursor: 'pointer', fontSize: 13,
          }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        {stats && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16, marginBottom: 32,
          }}>
            <StatCard icon={TrendingUp}  label="MRR"             value={mrr}                       color="#7c3aed" />
            <StatCard icon={Users}       label="Clientes ativos" value={stats.total_ativos}         color="#10b981" />
            <StatCard icon={Clock}       label="Em trial"        value={stats.em_trial}             color="#f59e0b" />
            <StatCard icon={AlertCircle} label="Inadimplentes"   value={stats.churned}              color="#ef4444" />
          </div>
        )}

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[{ id: 'clientes', label: `Clientes (${total})` }].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: aba === a.id ? 'linear-gradient(135deg, #7c3aed, #db2777)' : '#1a1a1f',
              border: `1px solid ${aba === a.id ? 'transparent' : '#2d2d35'}`,
              color: aba === a.id ? '#fff' : '#9ca3af', cursor: 'pointer',
            }}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input
              type="text"
              placeholder="Buscar por empresa ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1a1a1f', border: '1px solid #2d2d35',
                borderRadius: 8, padding: '9px 12px 9px 36px',
                color: '#fff', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            style={{
              background: '#1a1a1f', border: '1px solid #2d2d35',
              borderRadius: 8, padding: '9px 14px',
              color: '#9ca3af', fontSize: 13, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">Todos os status</option>
            <option value="trial">Trial</option>
            <option value="ativo">Ativo</option>
            <option value="inadimplente">Inadimplente</option>
            <option value="suspenso">Suspenso</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <button
            onClick={carregarTenants}
            style={{
              background: '#1a1a1f', border: '1px solid #2d2d35',
              borderRadius: 8, padding: '9px 14px',
              color: '#9ca3af', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Tabela */}
        <div style={{
          background: '#1a1a1f', border: '1px solid #2d2d35',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2d2d35' }}>
                {['Empresa', 'Plano', 'Status', 'Usuários', 'Desconto', 'Cadastro', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '12px 16px', textAlign: 'left',
                    color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum cliente encontrado</td></tr>
              ) : tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #2d2d35' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#0f0f10'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{t.nome_empresa}</p>
                    <p style={{ color: '#6b7280', fontSize: 11 }}>{t.email_contato}</p>
                    {t.acesso_gratuito && (
                      <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>🎁 GRÁTIS</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13 }}>
                    {t.plano_nome || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13 }}>
                    {t.total_usuarios}
                  </td>
                  <td style={{ padding: '12px 16px', color: t.desconto_percentual > 0 ? '#7c3aed' : '#6b7280', fontSize: 13, fontWeight: 600 }}>
                    {t.desconto_percentual > 0 ? `${t.desconto_percentual}%` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>
                    {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => setSelectedTenant(t)}
                      style={{
                        background: '#2d2d35', border: 'none',
                        borderRadius: 6, padding: '6px 12px',
                        color: '#e5e7eb', cursor: 'pointer', fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Edit3 size={12} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edição */}
      {selectedTenant && (
        <ClienteModal
          tenant={selectedTenant}
          planos={planos}
          onClose={() => setSelectedTenant(null)}
          onSave={() => { carregarStats(); carregarTenants(); }}
        />
      )}
    </div>
  );
}
