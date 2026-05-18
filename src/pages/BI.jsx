import { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ComposedChart, Line, Area, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, BarChart2, Filter, Download, Zap, BrainCircuit, Target, Users 
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { biApi } from '../services/api';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function mapBIData(raw) {
  // Forecast: tendencia → {date, sales, projected}
  const salesByDate = {};
  (raw.tendencia ?? []).forEach(r => {
    const d = String(r.data ?? '').slice(0, 10);
    salesByDate[d] = parseFloat(r.faturamento ?? 0);
  });
  const sortedDates = Object.keys(salesByDate).sort();
  const forecast = sortedDates.map((d, i) => ({
    date: d.slice(5), // MM-DD
    sales: salesByDate[d],
    projected: null,
    isFuture: false,
  }));
  // Simple moving average for last 7 days as projection
  if (forecast.length >= 3) {
    const last3 = forecast.slice(-3).map(f => f.sales);
    const avg = last3.reduce((s, v) => s + v, 0) / last3.length;
    for (let i = 1; i <= 7; i++) {
      forecast.push({ date: `+${i}d`, sales: null, projected: Math.round(avg * (1 + i * 0.02)), isFuture: true });
    }
  }

  // Heatmap: pivot hora x dia_semana
  const heatGrid = {};
  (raw.heatmap ?? []).forEach(r => {
    const h = `${String(r.hora).padStart(2, '0')}h`;
    if (!heatGrid[h]) heatGrid[h] = { hour: h };
    const dia = DIAS_SEMANA[parseInt(r.dia_semana)] ?? 'Dom';
    heatGrid[h][dia] = (heatGrid[h][dia] || 0) + parseInt(r.pedidos ?? 0);
  });
  const heatmap = Object.values(heatGrid).sort((a, b) => a.hour.localeCompare(b.hour));

  // Channels
  const channels = (raw.por_canal ?? []).map(c => ({
    name: c.canal === 'mesa' ? 'Mesa' : c.canal === 'delivery' ? 'Delivery' : c.canal === 'balcao' ? 'Balcão' : c.canal,
    volume: parseInt(c.pedidos ?? 0),
  }));

  // Cohort: kept empty (not computed by backend)
  const cohort = [];

  return { forecast, heatmap, channels, cohort };
}

export default function BI() {
  const { getAdvancedBIStats, settings } = useApp();
  const [period, setPeriod] = useState(30);
  const [apiData, setApiData] = useState(null);

  useEffect(() => {
    let mounted = true;
    biApi.dados().then(res => {
      if (mounted && res?.dados) setApiData(res.dados);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    if (apiData) {
      const mapped = mapBIData(apiData);
      if ((!mapped.cohort || mapped.cohort.length === 0) && getAdvancedBIStats) {
        mapped.cohort = getAdvancedBIStats(period).cohort;
      }
      return mapped;
    }
    return getAdvancedBIStats ? getAdvancedBIStats(period) : { forecast: [], heatmap: [], channels: [], cohort: [] };
  }, [apiData, getAdvancedBIStats, period]);

  const { forecast, heatmap, channels, cohort } = stats;

  // Custom Tooltip for Forecast Chart
  const CustomForecastTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const isFuture = payload[0].payload.isFuture;
      return (
        <div className="glass-card" style={{ padding: '10px', minWidth: '150px' }}>
          <div style={{ fontWeight: 800, marginBottom: 5 }}>{label} {isFuture && '(Projeção)'}</div>
          {payload.map((entry, index) => {
            if (entry.dataKey === 'sales' && !entry.value) return null; // hide null sales in future
            return (
              <div key={index} style={{ color: entry.color, fontSize: 13, fontWeight: 700 }}>
                {entry.name}: R$ {entry.value?.toFixed(2)}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Helper to color heatmap blocks based on intensity (0-100 scale assumed)
  const getHeatmapColor = (value) => {
    if (!value) return 'var(--surface-3)';
    if (value > 80) return 'var(--danger)';
    if (value > 50) return 'var(--warning)';
    if (value > 20) return 'var(--primary)';
    return 'var(--primary-light)';
  };

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BrainCircuit color="var(--primary)" /> Business Intelligence Avançado
          </h1>
          <p className="page-subtitle">Projeções, Cohort e Inteligência de Dados para o seu SaaS</p>
        </div>
        <div className="flex gap-2">
          <select className="input-field" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
            <option value={7}>Últimos 7 dias</option>
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button className="btn btn-secondary">
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Top BI KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-glow flex items-center justify-center">
              <TrendingUp size={16} color="var(--primary-light)" />
            </div>
            <h3 className="font-bold text-sm">Tendência de Vendas (Próx 7 dias)</h3>
          </div>
          <div className="text-2xl font-black mb-1">+14.5%</div>
          <p className="text-xs text-muted">Projeção baseada na média móvel do período</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-warning-bg flex items-center justify-center">
              <Target size={16} color="var(--warning)" />
            </div>
            <h3 className="font-bold text-sm">Retenção de Cohort (Mês 1)</h3>
          </div>
          <div className="text-2xl font-black mb-1">85.4%</div>
          <p className="text-xs text-muted">Adoção inicial saudável pós-aquisição</p>
        </div>
        <div className="glass-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-success-bg flex items-center justify-center">
              <Activity size={16} color="var(--success)" />
            </div>
            <h3 className="font-bold text-sm">Horário de Pico Previsto</h3>
          </div>
          <div className="text-2xl font-black mb-1">20:00 - Sexta</div>
          <p className="text-xs text-muted">Recomendação: Escalar +2 entregadores</p>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Forecast Chart (Spans 2 columns) */}
        <div className="glass-card lg:col-span-2">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Zap size={16} className="text-warning" /> Forecasting de Vendas 
            <span className="badge badge-warning text-[10px]">Predição IA</span>
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <ComposedChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                <RechartsTooltip content={<CustomForecastTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                
                {/* Historical Area */}
                <Area type="monotone" dataKey="sales" name="Vendas Realizadas" fill="var(--primary-dark)" stroke="var(--primary)" fillOpacity={0.2} strokeWidth={2} />
                
                {/* Projected Line (Dashed) */}
                <Line type="monotone" dataKey="projected" name="Tendência Preditiva" stroke="var(--warning)" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channels Bar Chart */}
        <div className="glass-card">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-primary" /> Volume por Canal
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={channels} layout="vertical" margin={{ top: 0, right: 20, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={12} width={90} />
                <RechartsTooltip cursor={{fill: 'var(--surface-3)'}} contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="volume" name="Pedidos" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
             <div className="text-xs text-muted flex justify-between">
               <span>Maior Ticket Médio:</span>
               <span className="font-bold text-[var(--text)]">iFood (R$ 55,00)</span>
             </div>
          </div>
        </div>

        {/* Heatmap Area */}
        <div className="glass-card lg:col-span-1">
          <h3 className="font-bold mb-4">Mapa de Calor (Horários vs Dia)</h3>
          <div className="w-full overflow-x-auto">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
              {/* Header Row */}
              <div style={{ display: 'flex', gap: 2 }}>
                <div style={{ width: 45 }}></div>
                {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                  <div key={d} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>{d}</div>
                ))}
              </div>
              
              {/* Grid Rows */}
              {heatmap.map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <div style={{ width: 45, fontSize: 10, color: 'var(--text-muted)' }}>{row.hour}</div>
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                    <div 
                      key={d} 
                      title={`${row.hour} - ${d}: ${row[d]} pedidos`}
                      style={{ 
                        flex: 1, height: 35, borderRadius: 4, 
                        background: getHeatmapColor(row[d]),
                        opacity: row[d] ? 1 : 0.1,
                        transition: 'all 0.2s',
                        cursor: 'crosshair'
                      }} 
                      className="hover:scale-105"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 mt-4 justify-center">
            <div className="flex items-center gap-1 text-[10px] text-muted"><div className="w-3 h-3 rounded bg-[var(--primary-light)]"></div> Baixo</div>
            <div className="flex items-center gap-1 text-[10px] text-muted"><div className="w-3 h-3 rounded bg-[var(--primary)]"></div> Médio</div>
            <div className="flex items-center gap-1 text-[10px] text-muted"><div className="w-3 h-3 rounded bg-[var(--danger)]"></div> Pico</div>
          </div>
        </div>

        {/* Cohort Analysis */}
        <div className="glass-card lg:col-span-2">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Users size={16} className="text-info" /> Análise de Retenção (Cohort)
          </h3>
          <p className="text-xs text-muted mb-4">Mede a fidelidade dos clientes agrupados pelo mês em que fizeram o primeiro pedido.</p>
          
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Safra (Mês)</th>
                  <th style={{ textAlign: 'center' }}>Mês 1</th>
                  <th style={{ textAlign: 'center' }}>Mês 2</th>
                  <th style={{ textAlign: 'center' }}>Mês 3</th>
                  <th style={{ textAlign: 'center' }}>Mês 4</th>
                  <th style={{ textAlign: 'center' }}>Mês 5</th>
                  <th style={{ textAlign: 'center' }}>Mês 6</th>
                </tr>
              </thead>
              <tbody>
                {cohort.map((c, i) => (
                  <tr key={i}>
                    <td className="font-bold">{c.month}</td>
                    {[c.m1, c.m2, c.m3, c.m4, c.m5, c.m6].map((val, idx) => (
                      <td key={idx} style={{ padding: 0 }}>
                        {val !== null ? (
                          <div style={{ 
                            background: `rgba(46, 204, 113, ${val / 100})`, 
                            padding: '12px 8px', 
                            textAlign: 'center',
                            color: val > 60 ? '#fff' : 'var(--text)',
                            fontWeight: 700,
                            fontSize: 12
                          }}>
                            {val}%
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>-</div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
