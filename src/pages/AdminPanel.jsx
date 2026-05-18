import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, AlertCircle, CheckCircle, Clock,
  LogOut, Search, RefreshCw, ChevronDown, X, Save,
  Gift, Ban, Edit3, BarChart2, Package, Plus, Trash2,
  Check, Star, ToggleLeft, ToggleRight, AlertTriangle, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { checkBackend } from '../services/api';

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
    // Caso o servidor retorne um erro HTML (como Bad Gateway 502)
    const contentType = r.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Servidor indisponível (Resposta não-JSON)');
    }

    const data = await r.json();
    if (r.status === 401) {
      localStorage.removeItem('zullya_admin_token');
      window.location.href = '/admin/login';
    }
    return data;
  });
}

const STATUS_COLOR = {
  trial:        { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b',  label: 'Trial' },
  ativo:        { bg: 'rgba(16,185,129,0.15)',  text: '#10b981',  label: 'Ativo' },
  inadimplente: { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  label: 'Inadimplente' },
  suspenso:     { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444',  label: 'Suspenso' },
  cancelado:    { bg: 'rgba(107,114,128,0.15)', text: '#6b7280',  label: 'Cancelado' },
  expirado:     { bg: 'rgba(239,68,68,0.1)',    text: '#f87171',  label: 'Expirado' },
};

const MODULOS_LISTA = [
  { id: 'vendas',             label: 'Vendas / PDV' },
  { id: 'estoque',            label: 'Estoque' },
  { id: 'clientes',           label: 'Clientes / CRM Básico' },
  { id: 'financeiro',         label: 'Financeiro / DRE' },
  { id: 'crm',                label: 'CRM Avançado' },
  { id: 'nfe',                label: 'Fiscal / NF-e / NFC-e' },
  { id: 'relatorios',         label: 'Relatórios / BI' },
  { id: 'metas',              label: 'Metas e Comissões' },
  { id: 'multi_filial',       label: 'Multi-filial / Franquia' },
  { id: 'api_acesso',         label: 'API / Integrações' },
  { id: 'suporte_prioritario',label: 'Suporte Prioritário' },
  { id: 'automacoes',         label: 'Automações' },
  { id: 'logistica',          label: 'Logística' },
  { id: 'compras',            label: 'Compras / Fornecedores' },
  { id: 'funcionarios',       label: 'RH / Funcionários' },
  { id: 'fidelidade',         label: 'Programa de Fidelidade' },
];

// Dados Simulados Premium para o Modo Demo
const INITIAL_STATS = {
  mrr: 14850.00,
  total_ativos: 124,
  em_trial: 32,
  churned: 5
};

const INITIAL_PLANOS = [
  {
    id: 'p-1',
    nome: 'Starter',
    descricao: 'Para começar a organizar suas vendas e financeiro',
    valor_mensal: 59.00,
    valor_anual: 566.00,
    trial_dias: 14,
    max_usuarios: 1,
    max_filiais: 1,
    max_produtos: 500,
    modulos: ['vendas', 'estoque', 'clientes', 'financeiro'],
    ativo: true,
    destaque: false,
    total_tenants_ativos: 12
  },
  {
    id: 'p-2',
    nome: 'Business PRO',
    descricao: 'O ERP completo para sua loja crescer com notas fiscais',
    valor_mensal: 119.00,
    valor_anual: 1142.00,
    trial_dias: 14,
    max_usuarios: 5,
    max_filiais: 2,
    max_produtos: 2000,
    modulos: ['vendas', 'estoque', 'clientes', 'financeiro', 'crm', 'nfe', 'relatorios', 'funcionarios', 'automacoes', 'compras'],
    ativo: true,
    destaque: true,
    total_tenants_ativos: 84
  },
  {
    id: 'p-3',
    nome: 'Enterprise',
    descricao: 'Infraestrutura robusta dedicada com suporte VIP',
    valor_mensal: 249.00,
    valor_anual: 2390.00,
    trial_dias: 14,
    max_usuarios: 99,
    max_filiais: 5,
    max_produtos: 10000,
    modulos: ['vendas', 'estoque', 'clientes', 'financeiro', 'crm', 'nfe', 'relatorios', 'funcionarios', 'automacoes', 'compras', 'multi_filial', 'api_acesso', 'suporte_prioritario', 'logistica', 'fidelidade'],
    ativo: true,
    destaque: false,
    total_tenants_ativos: 28
  }
];

const INITIAL_TENANTS = [
  {
    id: 't-1',
    nome_empresa: 'Zullya Sistemas Ltda',
    email_contato: 'contato@zullya.com.br',
    plano_nome: 'Enterprise',
    plano_id: 'p-3',
    status: 'ativo',
    total_usuarios: 10,
    desconto_percentual: 0,
    acesso_gratuito: true,
    criado_em: '2026-04-01T10:00:00Z',
    trial_expira_em: null,
    notas_internas: 'Nosso próprio inquilino administrativo.'
  },
  {
    id: 't-2',
    nome_empresa: 'Açaí do Monstro',
    email_contato: 'monstro@acai.com',
    plano_nome: 'Business PRO',
    plano_id: 'p-2',
    status: 'ativo',
    total_usuarios: 4,
    desconto_percentual: 10,
    acesso_gratuito: false,
    criado_em: '2026-05-10T14:30:00Z',
    trial_expira_em: null,
    notas_internas: 'Cliente antigo. Solicita suporte aos fins de semana.'
  },
  {
    id: 't-3',
    nome_empresa: 'Moda & Estilo Store',
    email_contato: 'contato@modaestilo.com',
    plano_nome: 'Starter',
    plano_id: 'p-1',
    status: 'trial',
    total_usuarios: 2,
    desconto_percentual: 0,
    acesso_gratuito: false,
    criado_em: '2026-05-15T09:00:00Z',
    trial_expira_em: '2026-05-29T09:00:00Z',
    notas_internas: 'Interessado em migrar para o PRO após o trial.'
  },
  {
    id: 't-4',
    nome_empresa: 'Padaria Pão de Ouro',
    email_contato: 'gerencia@paodeouro.com.br',
    plano_nome: 'Business PRO',
    plano_id: 'p-2',
    status: 'inadimplente',
    total_usuarios: 5,
    desconto_percentual: 0,
    acesso_gratuito: false,
    criado_em: '2026-03-20T11:15:00Z',
    trial_expira_em: null,
    notas_internas: 'Fatura de Maio pendente de pagamento.'
  },
  {
    id: 't-5',
    nome_empresa: 'Restaurante Central',
    email_contato: 'financeiro@centralrest.com',
    plano_nome: 'Enterprise',
    plano_id: 'p-3',
    status: 'suspenso',
    total_usuarios: 12,
    desconto_percentual: 20,
    acesso_gratuito: false,
    criado_em: '2026-02-10T08:00:00Z',
    trial_expira_em: null,
    notas_internas: 'Bloqueado por falta de pagamento recorrente.'
  }
];

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

// ── Modal de edição de cliente ───────────────────────────────
function ClienteModal({ tenant, planos, onClose, onSave, modoDemo }) {
  const [status, setStatus] = useState(tenant.status);
  const [planoId, setPlanoId] = useState(tenant.plano_id || '');
  const [desconto, setDesconto] = useState(tenant.desconto_percentual || 0);
  const [gratuito, setGratuito] = useState(tenant.acesso_gratuito || false);
  const [notas, setNotas] = useState(tenant.notas_internas || '');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    
    // Modo Demo: Alterações salvas localmente
    if (modoDemo) {
      setTimeout(() => {
        const planoEscolhido = planos.find(p => p.id === planoId);
        const atualizado = {
          ...tenant,
          status,
          plano_id: planoId,
          plano_name: planoEscolhido ? planoEscolhido.nome : 'Sem plano',
          desconto_percentual: parseFloat(desconto),
          acesso_gratuito: gratuito,
          notas_internas: notas
        };
        onSave(atualizado);
        toast.success('Cliente atualizado no Modo Demo!');
        setSaving(false);
        onClose();
      }, 500);
      return;
    }

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
        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{tenant.nome_empresa}</h2>
        <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>{tenant.email_contato}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Status da conta</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
              <option value="trial">Trial</option>
              <option value="ativo">Ativo</option>
              <option value="inadimplente">Inadimplente</option>
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
              <option value="expirado">Expirado</option>
            </select>
          </div>
          {['inadimplente', 'suspenso', 'cancelado'].includes(status) && (
            <div>
              <label style={labelStyle}>Motivo do bloqueio</label>
              <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Fatura vencida há 30 dias" style={inputStyle} />
            </div>
          )}
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
          <div>
            <label style={labelStyle}>Desconto individual (%)</label>
            <input type="number" min="0" max="100" step="5" value={desconto} onChange={e => setDesconto(e.target.value)} style={inputStyle} />
            <p style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
              {desconto > 0 ? `Cliente paga ${100 - desconto}% do valor do plano` : 'Sem desconto aplicado'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 600 }}>Acesso gratuito</p>
              <p style={{ color: '#6b7280', fontSize: 12 }}>Mantém acesso sem cobrar</p>
            </div>
            <button onClick={() => setGratuito(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: gratuito ? '#7c3aed' : '#374151', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, left: gratuito ? 22 : 4, transition: 'left 0.2s' }} />
            </button>
          </div>
          <div>
            <label style={labelStyle}>Notas internas (só você vê)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Anotações sobre este cliente..." rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ background: '#0f0f10', borderRadius: 8, padding: 12, fontSize: 12, color: '#6b7280' }}>
            <p>Usuários: <strong style={{ color: '#e5e7eb' }}>{tenant.total_usuarios}</strong></p>
            <p>Cadastrado: <strong style={{ color: '#e5e7eb' }}>{new Date(tenant.criado_em).toLocaleDateString('pt-BR')}</strong></p>
            {tenant.trial_expira_em && (
              <p>Trial expira: <strong style={{ color: '#f59e0b' }}>{new Date(tenant.trial_expira_em).toLocaleDateString('pt-BR')}</strong></p>
            )}
          </div>
          <button onClick={save} disabled={saving} style={{ padding: '12px 0', background: saving ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #db2777)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de criação/edição de plano ─────────────────────────
function PlanoModal({ plano, onClose, onSave, modoDemo }) {
  const isNovo = !plano?.id;
  const [form, setForm] = useState({
    nome:         plano?.nome         ?? '',
    descricao:    plano?.descricao    ?? '',
    valor_mensal: plano?.valor_mensal ?? '',
    valor_anual:  plano?.valor_anual  ?? '',
    trial_dias:   plano?.trial_dias   ?? 14,
    max_usuarios: plano?.max_usuarios ?? 3,
    max_filiais:  plano?.max_filiais  ?? 1,
    max_produtos: plano?.max_produtos ?? 500,
    modulos:      Array.isArray(plano?.modulos) ? plano.modulos : [],
    ativo:        plano?.ativo        ?? true,
    destaque:     plano?.destaque     ?? false,
  });
  const [saving, setSaving] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const toggle = k => () => setForm(f => ({ ...f, [k]: !f[k] }));
  const toggleModulo = (id) => setForm(f => ({
    ...f,
    modulos: f.modulos.includes(id)
      ? f.modulos.filter(m => m !== id)
      : [...f.modulos, id],
  }));

  const save = async () => {
    if (!form.nome || !form.valor_mensal) {
      toast.error('Nome e valor mensal são obrigatórios');
      return;
    }
    setSaving(true);

    const body = {
      ...form,
      valor_mensal: parseFloat(form.valor_mensal),
      valor_anual: form.valor_anual ? parseFloat(form.valor_anual) : null,
      trial_dias: parseInt(form.trial_dias),
      max_usuarios: parseInt(form.max_usuarios),
      max_filiais: parseInt(form.max_filiais),
      max_produtos: parseInt(form.max_produtos),
    };

    if (modoDemo) {
      setTimeout(() => {
        const item = isNovo 
          ? { ...body, id: `p-${Date.now()}`, total_tenants_ativos: 0 }
          : { ...body, id: plano.id, total_tenants_ativos: plano.total_tenants_ativos };
        
        onSave(item);
        toast.success(isNovo ? 'Plano criado no Modo Demo!' : 'Plano atualizado no Modo Demo!');
        setSaving(false);
        onClose();
      }, 500);
      return;
    }

    try {
      const res = isNovo
        ? await adminFetch('/planos', { method: 'POST', body: JSON.stringify(body) })
        : await adminFetch(`/planos/${plano.id}`, { method: 'PUT', body: JSON.stringify(body) });

      if (res.sucesso) {
        toast.success(isNovo ? 'Plano criado!' : 'Plano atualizado!');
        onSave();
        onClose();
      } else {
        toast.error(res.mensagem || 'Erro ao salvar');
      }
    } catch {
      toast.error('Erro ao conectar ao salvar plano');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: '#1a1a1f', border: '1px solid #2d2d35', borderRadius: 16, padding: 32, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          {isNovo ? 'Novo Plano' : `Editar: ${plano.nome}`}
        </h2>
        {!isNovo && plano.total_tenants_ativos > 0 && (
          <p style={{ color: '#f59e0b', fontSize: 12, marginBottom: 20 }}>
            ⚠️ {plano.total_tenants_ativos} cliente(s) ativo(s) neste plano. Alterações de módulos afetarão eles imediatamente.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          {/* Nome */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Nome do plano *</label>
            <input value={form.nome} onChange={e => set('nome')(e.target.value)} placeholder="Ex: Starter, Pro Business, Enterprise" style={inputStyle} />
          </div>
          {/* Descrição */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={labelStyle}>Descrição</label>
            <input value={form.descricao} onChange={e => set('descricao')(e.target.value)} placeholder="Breve descrição do plano para os clientes" style={inputStyle} />
          </div>
          {/* Valores */}
          <div>
            <label style={labelStyle}>Valor mensal (R$) *</label>
            <input type="number" step="0.01" min="0" value={form.valor_mensal} onChange={e => set('valor_mensal')(e.target.value)} placeholder="Ex: 97.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Valor anual (R$) <span style={{ color: '#6b7280' }}>opcional</span></label>
            <input type="number" step="0.01" min="0" value={form.valor_anual} onChange={e => set('valor_anual')(e.target.value)} placeholder="Ex: 934.00 (10% off)" style={inputStyle} />
          </div>
          {/* Limites */}
          <div>
            <label style={labelStyle}>Max. usuários *</label>
            <input type="number" min="1" value={form.max_usuarios} onChange={e => set('max_usuarios')(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Dias de trial</label>
            <input type="number" min="0" max="90" value={form.trial_dias} onChange={e => set('trial_dias')(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Max. filiais</label>
            <input type="number" min="1" value={form.max_filiais} onChange={e => set('max_filiais')(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Max. produtos</label>
            <input type="number" min="1" value={form.max_produtos} onChange={e => set('max_produtos')(e.target.value)} style={inputStyle} />
          </div>
          {/* Toggles */}
          <div style={{ display: 'flex', gap: 24, gridColumn: '1/-1' }}>
            {[
              { key: 'ativo', label: 'Plano ativo', sub: 'Visível para clientes' },
              { key: 'destaque', label: 'Destaque', sub: 'Badge "Mais Popular"' },
            ].map(({ key, label, sub }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: '#0f0f10', borderRadius: 8, padding: '12px 16px', border: '1px solid #2d2d35', cursor: 'pointer' }} onClick={toggle(key)}>
                <div>
                  <p style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 600 }}>{label}</p>
                  <p style={{ color: '#6b7280', fontSize: 11 }}>{sub}</p>
                </div>
                <button style={{ marginLeft: 'auto', width: 40, height: 22, borderRadius: 11, background: form[key] ? '#7c3aed' : '#374151', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, left: form[key] ? 21 : 3, transition: 'left 0.15s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Módulos */}
        <div style={{ marginTop: 24 }}>
          <label style={{ ...labelStyle, marginBottom: 12 }}>Módulos incluídos ({form.modulos.length}/{MODULOS_LISTA.length})</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
            {MODULOS_LISTA.map(m => {
              const ativo = form.modulos.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleModulo(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    border: `1px solid ${ativo ? '#7c3aed' : '#2d2d35'}`,
                    background: ativo ? 'rgba(124,58,237,0.12)' : '#0f0f10',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: ativo ? '#7c3aed' : '#374151',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {ativo && <Check size={12} color="#fff" />}
                  </div>
                  <span style={{ fontSize: 12, color: ativo ? '#c4b5fd' : '#9ca3af' }}>{m.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => set('modulos')(MODULOS_LISTA.map(m => m.id))} style={{ fontSize: 11, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Selecionar todos</button>
            <button type="button" onClick={() => set('modulos')([])} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Limpar</button>
          </div>
        </div>

        <button onClick={save} disabled={saving} style={{ marginTop: 28, width: '100%', padding: '13px 0', background: saving ? '#4b5563' : 'linear-gradient(135deg, #7c3aed, #db2777)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Save size={16} />
          {saving ? 'Salvando...' : isNovo ? 'Criar Plano' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}

// ── Aba de Planos ────────────────────────────────────────────
function PlanosTab({ planos, loading, setModalPlano, setConfirmDelete, modoDemo }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ color: '#9ca3af', fontSize: 13 }}>{planos.length} plano(s) cadastrado(s) {modoDemo && '(Modo Demo)'}</p>
        <button
          onClick={() => setModalPlano({})}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Novo Plano
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Carregando...</div>
      ) : planos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Nenhum plano cadastrado</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {planos.map(p => {
            const modulosArr = Array.isArray(p.modulos)
              ? p.modulos
              : (typeof p.modulos === 'string' ? JSON.parse(p.modulos || '[]') : []);

            return (
              <div key={p.id} style={{
                background: '#1a1a1f',
                border: `1px solid ${p.destaque ? '#7c3aed' : '#2d2d35'}`,
                borderRadius: 12, padding: 20, position: 'relative',
                opacity: p.ativo ? 1 : 0.5,
              }}>
                {p.destaque && (
                  <div style={{
                    position: 'absolute', top: -8, right: 16,
                    background: '#7c3aed', color: '#fff',
                    fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20,
                  }}>
                    ★ DESTAQUE
                  </div>
                )}
                {!p.ativo && (
                  <div style={{
                    position: 'absolute', top: -8, left: 16,
                    background: '#374151', color: '#9ca3af',
                    fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20,
                  }}>
                    INATIVO
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{p.nome}</p>
                    {p.descricao && <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{p.descricao}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#7c3aed', fontWeight: 800, fontSize: 18 }}>
                      R$ {parseFloat(p.valor_mensal).toFixed(2)}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: 11 }}>/mês</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                  <span>👥 {p.max_usuarios} usuários</span>
                  <span>📅 {p.trial_dias}d trial</span>
                  <span>🏢 {p.max_filiais} filial</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {modulosArr.slice(0, 5).map(m => {
                    const mod = MODULOS_LISTA.find(x => x.id === m);
                    return (
                      <span key={m} style={{
                        background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                        border: '1px solid rgba(124,58,237,0.2)',
                        fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                      }}>
                        {mod?.label || m}
                      </span>
                    );
                  })}
                  {modulosArr.length > 5 && (
                    <span style={{ fontSize: 10, color: '#6b7280', padding: '2px 4px' }}>
                      +{modulosArr.length - 5} mais
                    </span>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #2d2d35', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: p.total_tenants_ativos > 0 ? '#10b981' : '#6b7280' }}>
                    {p.total_tenants_ativos || 0} cliente(s) ativo(s)
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setModalPlano(p)}
                      style={{ background: '#2d2d35', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#e5e7eb', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit3 size={12} /> Editar
                    </button>
                    {p.ativo && (
                      <button
                        onClick={() => setConfirmDelete(p)}
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '6px 10px', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
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

// ── Painel Admin principal ───────────────────────────────────
export default function AdminPanel() {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('zullya_admin') || '{}');

  const [stats, setStats] = useState(INITIAL_STATS);
  const [tenants, setTenants] = useState(INITIAL_TENANTS);
  const [planos, setPlanos] = useState(INITIAL_PLANOS);
  const [total, setTotal] = useState(INITIAL_TENANTS.length);
  
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [modalPlano, setModalPlano] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [aba, setAba] = useState('clientes');
  const [modoDemo, setModoDemo] = useState(false);

  // Carregar dados de forma segura (resiliente)
  const carregarStats = useCallback(async (isDemo) => {
    if (isDemo) return;
    try {
      const data = await adminFetch('/stats');
      if (data.sucesso) setStats(data.dados);
    } catch {
      console.warn('Erro ao carregar estatísticas reais do servidor. Mantendo dados simulados.');
    }
  }, []);

  const carregarTenants = useCallback(async (isDemo) => {
    if (isDemo) {
      setLoading(true);
      // Simular busca/filtro local no Modo Demo
      let filtrados = [...INITIAL_TENANTS];
      if (busca) {
        filtrados = filtrados.filter(t => 
          t.nome_empresa.toLowerCase().includes(busca.toLowerCase()) || 
          t.email_contato.toLowerCase().includes(busca.toLowerCase())
        );
      }
      if (filtroStatus) {
        filtrados = filtrados.filter(t => t.status === filtroStatus);
      }
      setTenants(filtrados);
      setTotal(filtrados.length);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.set('busca', busca);
      if (filtroStatus) params.set('status', filtroStatus);
      const data = await adminFetch(`/tenants?${params}`);
      if (data.sucesso) { 
        setTenants(data.dados); 
        setTotal(data.total); 
      }
    } catch (err) {
      console.warn('Erro ao conectar ao carregar inquilinos reais. Usando simulados.', err);
    } finally {
      setLoading(false);
    }
  }, [busca, filtroStatus]);

  const carregarPlanos = useCallback(async (isDemo) => {
    if (isDemo) return;
    try {
      const data = await adminFetch('/planos');
      if (data.sucesso) setPlanos(data.dados);
    } catch {
      console.warn('Erro ao carregar planos reais. Mantendo simulados.');
    }
  }, []);

  // Inicialização com detecção de rede
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('zullya_admin_token');
      if (!token || token === 'demo-admin-token') {
        localStorage.removeItem('zullya_admin_token');
        localStorage.removeItem('zullya_admin');
        navigate('/admin/login');
        return;
      }

      const online = await checkBackend();
      setModoDemo(false);
      
      if (!online) {
        toast.error('Erro de conexão com a API na VPS Hostinger.', { icon: '⚠️' });
        navigate('/admin/login');
        return;
      }

      // Carregar
      await Promise.all([
        carregarStats(false),
        carregarTenants(false),
        carregarPlanos(false)
      ]);
      setLoading(false);
    };

    init();
  }, [navigate, busca, filtroStatus, carregarStats, carregarTenants, carregarPlanos]);

  const logout = () => {
    localStorage.removeItem('zullya_admin_token');
    localStorage.removeItem('zullya_admin');
    navigate('/admin/login');
  };

  const desativarPlano = async (plano) => {
    if (modoDemo) {
      setPlanos(planos.filter(p => p.id !== plano.id));
      toast.success(`Plano "${plano.nome}" removido (Modo Demo)`);
      setConfirmDelete(null);
      return;
    }

    try {
      const res = await adminFetch(`/planos/${plano.id}`, { method: 'DELETE' });
      if (res.sucesso) {
        toast.success(`Plano "${plano.nome}" desativado.`);
        carregarPlanos(false);
      } else {
        toast.error(res.mensagem || 'Erro ao desativar');
      }
    } catch {
      toast.error('Erro de rede ao desativar plano');
    }
    setConfirmDelete(null);
  };

  // Salvar cliente após edição no modal
  const handleSaveTenant = (atualizado) => {
    if (modoDemo) {
      setTenants(tenants.map(t => t.id === atualizado.id ? atualizado : t));
      
      // Recalcular status simulados rapidamente
      const tempTenants = tenants.map(t => t.id === atualizado.id ? atualizado : t);
      const mrrSoma = tempTenants.reduce((acc, t) => {
        if (t.status !== 'ativo' || t.acesso_gratuito) return acc;
        const p = planos.find(x => x.id === t.plano_id);
        const valor = p ? p.valor_mensal : 0;
        const desc = t.desconto_percentual ? (1 - t.desconto_percentual / 100) : 1;
        return acc + (valor * desc);
      }, 0);

      setStats({
        mrr: mrrSoma || INITIAL_STATS.mrr,
        total_ativos: tempTenants.filter(t => t.status === 'ativo').length,
        em_trial: tempTenants.filter(t => t.status === 'trial').length,
        churned: tempTenants.filter(t => t.status === 'inadimplente').length
      });
      return;
    }
    // Online
    carregarStats(false);
    carregarTenants(false);
  };

  // Salvar/Criar plano após edição no modal
  const handleSavePlano = (novoPlano) => {
    if (modoDemo) {
      const existe = planos.some(p => p.id === novoPlano.id);
      if (existe) {
        setPlanos(planos.map(p => p.id === novoPlano.id ? novoPlano : p));
      } else {
        setPlanos([...planos, novoPlano]);
      }
      return;
    }
    carregarPlanos(false);
  };

  const mrr = stats ? `R$ ${parseFloat(stats.mrr || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f10', color: '#e5e7eb' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1f', borderBottom: '1px solid #2d2d35', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={18} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>Zullya Admin</p>
              {modoDemo && (
                <span style={{
                  fontSize: 10, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                  border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 20, padding: '2px 8px', fontWeight: 700
                }}>
                  Modo Demo (Offline)
                </span>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#6b7280' }}>Painel de gestão da plataforma</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Olá, {admin.nome || 'Admin'}</p>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #2d2d35', borderRadius: 8, padding: '6px 12px', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard icon={TrendingUp}  label="MRR Estimado"    value={mrr}                  color="#7c3aed" />
            <StatCard icon={Users}       label="Clientes ativos" value={stats.total_ativos}    color="#10b981" />
            <StatCard icon={Clock}       label="Em trial"        value={stats.em_trial}         color="#f59e0b" />
            <StatCard icon={AlertCircle} label="Inadimplentes"   value={stats.churned}          color="#ef4444" />
          </div>
        )}

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[
            { id: 'clientes', label: `Clientes (${total})`, icon: Users },
            { id: 'planos',   label: 'Gestão de Planos',   icon: Package },
          ].map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: aba === a.id ? 'linear-gradient(135deg, #7c3aed, #db2777)' : '#1a1a1f',
                border: `1px solid ${aba === a.id ? 'transparent' : '#2d2d35'}`,
                color: aba === a.id ? '#fff' : '#9ca3af', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <a.icon size={15} />
              {a.label}
            </button>
          ))}
        </div>

        {/* Aba Clientes */}
        {aba === 'clientes' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
                <input
                  type="text" placeholder="Buscar por empresa ou e-mail..."
                  value={busca} onChange={e => setBusca(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', background: '#1a1a1f', border: '1px solid #2d2d35', borderRadius: 8, padding: '9px 12px 9px 36px', color: '#fff', fontSize: 13, outline: 'none' }}
                />
              </div>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ background: '#1a1a1f', border: '1px solid #2d2d35', borderRadius: 8, padding: '9px 14px', color: '#9ca3af', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="">Todos os status</option>
                <option value="trial">Trial</option>
                <option value="ativo">Ativo</option>
                <option value="inadimplente">Inadimplente</option>
                <option value="suspenso">Suspenso</option>
                <option value="cancelado">Cancelado</option>
                <option value="expirado">Expirado</option>
              </select>
              <button onClick={() => carregarTenants(modoDemo)} style={{ background: '#1a1a1f', border: '1px solid #2d2d35', borderRadius: 8, padding: '9px 14px', color: '#9ca3af', cursor: 'pointer' }}>
                <RefreshCw size={14} />
              </button>
            </div>

            <div style={{ background: '#1a1a1f', border: '1px solid #2d2d35', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2d2d35' }}>
                    {['Empresa', 'Plano', 'Status', 'Usuários', 'Desconto', 'Trial/Venc.', 'Cadastro', 'Ações'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6b7280', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</td></tr>
                  ) : tenants.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum cliente encontrado</td></tr>
                  ) : tenants.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #2d2d35' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#0f0f10'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{t.nome_empresa}</p>
                        <p style={{ color: '#6b7280', fontSize: 11 }}>{t.email_contato}</p>
                        {t.acesso_gratuito && <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>🎁 GRÁTIS</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13 }}>{t.plano_nome || '—'}</td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={t.status} /></td>
                      <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 13 }}>{t.total_usuarios}</td>
                      <td style={{ padding: '12px 16px', color: t.desconto_percentual > 0 ? '#7c3aed' : '#6b7280', fontSize: 13, fontWeight: 600 }}>
                        {t.desconto_percentual > 0 ? `${t.desconto_percentual}%` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>
                        {t.trial_expira_em ? new Date(t.trial_expira_em).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{new Date(t.criado_em).toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => setSelectedTenant(t)} style={{ background: '#2d2d35', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#e5e7eb', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Edit3 size={12} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Aba Planos */}
        {aba === 'planos' && (
          <PlanosTab
            planos={planos}
            loading={loading}
            setModalPlano={setModalPlano}
            setConfirmDelete={setConfirmDelete}
            modoDemo={modoDemo}
          />
        )}
      </div>

      {selectedTenant && (
        <ClienteModal
          tenant={selectedTenant}
          planos={planos}
          modoDemo={modoDemo}
          onClose={() => setSelectedTenant(null)}
          onSave={handleSaveTenant}
        />
      )}

      {/* Modal criar/editar plano */}
      {modalPlano !== null && (
        <PlanoModal
          plano={Object.keys(modalPlano).length === 0 ? null : modalPlano}
          modoDemo={modoDemo}
          onClose={() => setModalPlano(null)}
          onSave={handleSavePlano}
        />
      )}

      {/* Confirm desativar */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1a1a1f', border: '1px solid #2d2d35', borderRadius: 12, padding: 32, maxWidth: 420, width: '100%' }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Desativar plano "{confirmDelete.nome}"?</p>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24 }}>
              O plano ficará invisível para novos clientes. Clientes existentes não serão afetados.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => desativarPlano(confirmDelete)} style={{ flex: 1, padding: '10px 0', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>
                Desativar
              </button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 0', background: '#2d2d35', border: 'none', borderRadius: 8, color: '#e5e7eb', cursor: 'pointer', fontWeight: 700 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
