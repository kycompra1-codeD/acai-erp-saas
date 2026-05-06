import { useState, useMemo } from 'react';
import { 
  Heart, Gift, Star, TrendingUp, Users, Settings, 
  Search, Plus, ArrowRight, ShieldCheck, Zap,
  Calendar, PieChart, Coins
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import toast from 'react-hot-toast';

export default function Loyalty() {
  const { customers = [], settings, updateSettings } = useApp();
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');

  // Mock Loyalty Stats
  const stats = [
    { label: 'Clientes no Programa', value: '1.240', icon: Users, color: 'var(--primary)' },
    { label: 'Pontos Acumulados', value: '45.820', icon: Star, color: 'var(--warning)' },
    { label: 'Cashback Resgatado', value: 'R$ 3.420', icon: Coins, color: 'var(--success)' },
    { label: 'Taxa de Retenção', value: '84%', icon: TrendingUp, color: 'var(--info)' },
  ];

  const loyaltySettings = settings?.loyalty || {
    enabled: true,
    pointsPerReal: 1,
    minRedeemPoints: 100,
    cashbackPercent: 5,
    expiryDays: 90
  };

  const handleUpdateSetting = (key, value) => {
    if (!updateSettings) return;
    updateSettings({
      ...(settings || {}),
      loyalty: { ...loyaltySettings, [key]: value }
    });
    toast.success('Configuração de fidelidade atualizada!');
  };

  const filteredCustomers = useMemo(() => {
    return (customers || []).filter(c => 
      c.name?.toLowerCase().includes(search.toLowerCase()) || 
      c.phone?.includes(search)
    ).slice(0, 10);
  }, [customers, search]);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fidelidade & Cashback</h1>
          <p className="page-subtitle">Transforme clientes casuais em fãs apaixonados pelo seu açaí</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary">
            <Plus size={16} /> Nova Campanha
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-4 mb-8">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}20` }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Management */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tabs */}
          <div className="flex gap-4 mb-4 border-b">
            {[
              { id: 'overview', label: 'Dashboard', icon: PieChart },
              { id: 'customers', label: 'Clientes Fidelizados', icon: Users },
              { id: 'campaigns', label: 'Campanhas', icon: Zap },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`btn btn-ghost ${tab === t.id ? 'active' : ''}`}
                style={{ 
                  borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
                  borderRadius: 0,
                  padding: '12px 8px'
                }}
              >
                <t.icon size={16} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="glass-card">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Star size={18} color="var(--warning)" /> Ranking de Fidelidade
                </h3>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Nível</th>
                        <th>Pontos</th>
                        <th>Cashback Disp.</th>
                        <th>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c, i) => (
                        <tr key={i}>
                          <td>
                            <div className="font-bold">{c.name}</div>
                            <div className="text-xs text-muted">{c.phone}</div>
                          </td>
                          <td>
                            <span className={`badge ${i < 3 ? 'badge-primary' : 'badge-muted'}`}>
                              {i === 0 ? '🏆 Diamante' : i < 3 ? '🥈 Ouro' : '🥉 Prata'}
                            </span>
                          </td>
                          <td className="font-bold">{(1200 - (i * 100))} pts</td>
                          <td className="text-success font-bold">R$ {(50 - (i * 5)).toFixed(2)}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm">Ver Perfil</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="glass-card">
                  <h3 className="font-bold mb-4">Resgates Recentes</h3>
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 rounded bg-surface-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-glow flex items-center justify-center">
                            <Gift size={14} color="var(--primary-light)" />
                          </div>
                          <div>
                            <div className="text-sm font-bold">Copo 500ml Grátis</div>
                            <div className="text-xs text-muted">Há 2 horas por Marcos Silva</div>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-danger">-300 pts</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-card">
                  <h3 className="font-bold mb-4">Próximos Vencimentos</h3>
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 rounded bg-surface-2">
                        <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-muted" />
                          <div>
                            <div className="text-sm font-bold">Lúcia Ferreira</div>
                            <div className="text-xs text-muted">Vence em 5 dias</div>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-warning">150 pts</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'campaigns' && (
            <div className="grid grid-2">
              <div className="glass-card border-primary" style={{ borderStyle: 'dashed' }}>
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary-glow flex items-center justify-center mb-4">
                    <Zap size={32} color="var(--primary)" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Campanha Relâmpago</h3>
                  <p className="text-sm text-muted mb-6">Dobre os pontos para pedidos feitos hoje entre 14h e 17h.</p>
                  <button className="btn btn-primary w-full">Ativar Agora</button>
                </div>
              </div>
              <div className="glass-card">
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mb-4">
                    <Heart size={32} color="var(--success)" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">Bônus de Aniversário</h3>
                  <p className="text-sm text-muted mb-6">Envie R$ 10 de cashback automático no dia do aniversário do cliente.</p>
                  <button className="btn btn-secondary w-full">Configurar</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Settings */}
        <div className="space-y-6">
          <div className="glass-card">
            <div className="flex items-center gap-2 mb-6">
              <Settings size={18} className="text-primary-light" />
              <h3 className="font-bold">Regras do Programa</h3>
            </div>
            
            <div className="space-y-6">
              <div className="form-group">
                <label className="form-label">Status do Programa</label>
                <div className="flex items-center justify-between p-3 rounded bg-surface-2">
                  <span className="text-sm">Programa Ativo</span>
                  <input 
                    type="checkbox" 
                    checked={loyaltySettings.enabled}
                    onChange={e => handleUpdateSetting('enabled', e.target.checked)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pontuação Base</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    className="input-field" 
                    value={loyaltySettings.pointsPerReal}
                    onChange={e => handleUpdateSetting('pointsPerReal', parseInt(e.target.value))}
                  />
                  <span className="text-xs text-muted">Ponto por cada R$ 1,00 gasto</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cashback (%)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    className="input-field" 
                    value={loyaltySettings.cashbackPercent}
                    onChange={e => handleUpdateSetting('cashbackPercent', parseInt(e.target.value))}
                  />
                  <span className="text-xs text-muted">% de retorno em saldo</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Resgate Mínimo</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    className="input-field" 
                    value={loyaltySettings.minRedeemPoints}
                    onChange={e => handleUpdateSetting('minRedeemPoints', parseInt(e.target.value))}
                  />
                  <span className="text-xs text-muted">Pontos necessários para resgatar</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Expiração de Pontos</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    className="input-field" 
                    value={loyaltySettings.expiryDays}
                    onChange={e => handleUpdateSetting('expiryDays', parseInt(e.target.value))}
                  />
                  <span className="text-xs text-muted">Dias de validade</span>
                </div>
              </div>

              <div className="p-4 rounded bg-primary-glow border border-primary-dark/30">
                <div className="flex gap-3">
                  <ShieldCheck size={20} className="text-primary-light shrink-0" />
                  <p className="text-xs leading-relaxed">
                    <strong>Dica Pro:</strong> Programas com 5% de cashback aumentam a recorrência em até 40% no setor de alimentação.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card bg-gradient-to-br from-primary-dark/20 to-accent/10">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Star size={16} className="text-warning" /> Nível VIP Enterprise
            </h3>
            <p className="text-xs text-muted mb-4">
              Desbloqueie o sistema de <strong>Níveis de Fidelidade</strong> (Bronze, Prata, Ouro) para oferecer benefícios exclusivos.
            </p>
            <button className="btn btn-primary btn-sm w-full">Fazer Upgrade</button>
          </div>
        </div>

      </div>
    </div>
  );
}
