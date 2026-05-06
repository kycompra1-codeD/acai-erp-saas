import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Calendar, Download, Filter, Grape, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, isSameDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#7C3AED', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

function fmt(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function safeIsWithinInterval(dateStr, interval) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  try { return isWithinInterval(d, interval); } catch { return false; }
}

function safeIsSameDay(dateStr, compareDate) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  try { return isSameDay(d, compareDate); } catch { return false; }
}

function exportCSV(orders, dateLabel) {
  const rows = [
    ['Pedido', 'Data', 'Cliente', 'Tipo', 'Pagamento', 'Itens', 'Total', 'Status'],
    ...orders.map(o => [
      `#${String(o.number || o.id).padStart(4, '0')}`,
      o.createdAt ? format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
      o.customerName || 'Balcão',
      o.type || 'balcão',
      o.payment || '',
      (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(' | '),
      Number(o.total || 0).toFixed(2).replace('.', ','),
      o.status || '',
    ])
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-pedidos-${dateLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { orders = [], financeEntries = [], products = [] } = useApp();
  const [rangeMode, setRangeMode] = useState('7d'); // '7d' | '30d' | 'custom'
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Compute effective range
  const { start, end } = useMemo(() => {
    if (rangeMode === 'custom') {
      return {
        start: startOfDay(new Date(dateFrom + 'T00:00:00')),
        end: endOfDay(new Date(dateTo + 'T00:00:00')),
      };
    }
    const days = rangeMode === '7d' ? 7 : 30;
    return {
      start: startOfDay(subDays(new Date(), days - 1)),
      end: endOfDay(new Date()),
    };
  }, [rangeMode, dateFrom, dateTo]);

  const periodOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'cancelled') return false;
      try {
        return safeIsWithinInterval(o.createdAt, { start, end });
      } catch { return false; }
    });
  }, [orders, start, end]);

  const stats = useMemo(() => {
    const totalRevenue = periodOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const orderCount = periodOrders.length;
    const avgTicket = orderCount ? totalRevenue / orderCount : 0;
    const itemsCount = periodOrders.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + i.quantity, 0) || 0), 0);
    return { totalRevenue, orderCount, avgTicket, itemsCount };
  }, [periodOrders]);


  const salesData = useMemo(() => {
    const interval = eachDayOfInterval({ start, end });
    return interval.map(date => {
      const dayOrders = periodOrders.filter(o => safeIsSameDay(o.createdAt, date));
      const dayEntries = financeEntries.filter(f => safeIsSameDay(f.date, date));
      const entradas = dayEntries.filter(f => f.type === 'entrada').reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const saidas = dayEntries.filter(f => f.type === 'saida').reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const vendas = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
      return {
        name: format(date, 'dd/MM'),
        vendas,
        entradas: entradas + vendas,
        saidas,
        saldo: entradas + vendas - saidas,
        pedidos: dayOrders.length,
      };
    });
  }, [periodOrders, financeEntries, start, end]);

  const categoryData = useMemo(() => {
    const cats = {};
    periodOrders.forEach(o => {
      o.items?.forEach(item => {
        const cat = item.name?.includes('Açaí') ? 'Açaí'
          : item.name?.includes('Suco') || item.name?.includes('Água') ? 'Bebidas'
          : item.name?.includes('Tapioca') || item.name?.includes('Churros') ? 'Sobremesas'
          : 'Complementos';
        cats[cat] = (cats[cat] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [periodOrders]);

  const topProducts = useMemo(() => {
    const prods = {};
    periodOrders.forEach(o => {
      o.items?.forEach(i => { prods[i.name] = (prods[i.name] || 0) + i.quantity; });
    });
    return Object.entries(prods).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [periodOrders]);

  const [tab, setTab] = useState('performance'); // 'performance' | 'dre'

  const dreData = useMemo(() => {
    // 1. Receita Bruta
    const orderRevenue = stats.totalRevenue;
    const manualRevenue = financeEntries
      .filter(f => f.type === 'entrada' && f.category !== 'Vendas PDV' && safeIsWithinInterval(f.date, { start, end }))
      .reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const grossRevenue = orderRevenue + manualRevenue;

    // 2. Deduções
    const taxes = grossRevenue * 0.06; // Mock 6% taxes
    const cancellations = orders
      .filter(o => o.status === 'cancelled' && safeIsWithinInterval(o.createdAt, { start, end }))
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const deductions = taxes + cancellations;

    // 3. Receita Líquida
    const netRevenue = grossRevenue - deductions;

    // 4. Custos (CMV)
    const cmv = periodOrders.reduce((s, o) => {
      const orderCost = o.items?.reduce((is, item) => {
        // Find product to get real cost
        const prod = products.find(p => p.id === item.productId || p.name === item.name);
        return is + ((prod?.cost || (item.price * 0.4)) * item.quantity);
      }, 0) || 0;
      return s + orderCost;
    }, 0);

    // 5. Lucro Bruto
    const grossProfit = netRevenue - cmv;

    // 6. Despesas Operacionais
    const operationalExpenses = financeEntries
      .filter(f => f.type === 'saida' && safeIsWithinInterval(f.date, { start, end }))
      .reduce((s, f) => s + (Number(f.amount) || 0), 0);

    // 7. EBITDA e Resultado Líquido
    const ebitda = grossProfit - operationalExpenses;
    const netResult = ebitda;

    return { 
      grossRevenue, orderRevenue, manualRevenue, 
      deductions, taxes, cancellations,
      netRevenue, cmv, grossProfit, 
      operationalExpenses, ebitda, netResult 
    };
  }, [stats, periodOrders, financeEntries, start, end, products, orders]);

  const dateLabel = `${format(start, 'dd-MM-yyyy')}_a_${format(end, 'dd-MM-yyyy')}`;

  return (
    <div className="animate-fade space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="stat-icon" style={{ background: 'var(--primary-glow)', color: 'var(--primary-light)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Relatórios e B.I.</h2>
            <div className="flex gap-4 mt-1">
              <button onClick={() => setTab('performance')} style={{ fontSize: 12, fontWeight: 700, color: tab === 'performance' ? 'var(--primary-light)' : 'var(--text-muted)', borderBottom: tab === 'performance' ? '2px solid var(--primary)' : 'none', paddingBottom: 2 }}>Performance</button>
              <button onClick={() => setTab('dre')} style={{ fontSize: 12, fontWeight: 700, color: tab === 'dre' ? 'var(--primary-light)' : 'var(--text-muted)', borderBottom: tab === 'dre' ? '2px solid var(--primary)' : 'none', paddingBottom: 2 }}>DRE Gerencial</button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
          <div className="flex bg-surface-2 p-1 rounded-radius border border-border">
            {[['7d', '7 dias'], ['30d', '30 dias'], ['custom', 'Personalizado']].map(([r, l]) => (
              <button key={r} className={`btn btn-sm ${rangeMode === r ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRangeMode(r)} style={{ minWidth: 80 }}>{l}</button>
            ))}
          </div>
          <button className="btn btn-secondary" onClick={() => exportCSV(periodOrders, dateLabel)}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Custom date picker */}
      {rangeMode === 'custom' && (
        <div className="glass-card p-4 flex flex-wrap gap-4 items-end">
          <div className="form-group mb-0">
            <label className="form-label">Data inicial</label>
            <input className="input-field" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} max={dateTo} />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Data final</label>
            <input className="input-field" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom} />
          </div>
          <div className="text-sm text-muted pb-1">
            <Calendar size={14} className="inline mr-1" />
            {Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1} dia(s) selecionado(s)
          </div>
        </div>
      )}

      {tab === 'performance' ? (
        <>
          {/* KPIs */}
          {(() => {
            const totalEntradas = financeEntries.filter(f => f.type === 'entrada' && isWithinInterval(new Date(f.date), { start, end })).reduce((s, f) => s + Number(f.amount || 0), 0);
            const totalSaidas = financeEntries.filter(f => f.type === 'saida' && isWithinInterval(new Date(f.date), { start, end })).reduce((s, f) => s + Number(f.amount || 0), 0);
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Faturamento Total', value: fmt(stats.totalRevenue), icon: DollarSign, color: '#10b981' },
                  { label: 'Total de Pedidos', value: stats.orderCount, icon: ShoppingBag, color: 'var(--primary-light)' },
                  { label: 'Entradas', value: fmt(totalEntradas + stats.totalRevenue), icon: ArrowUpCircle, color: '#10b981' },
                  { label: 'Saídas', value: fmt(totalSaidas), icon: ArrowDownCircle, color: '#ef4444' },
                ].map((m, i) => (
                  <div key={i} className="glass-card flex items-center gap-4">
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color, border: '1px solid var(--border)', flexShrink: 0 }}>
                      <m.icon size={20} />
                    </div>
                    <div>
                      <div className="text-xs text-muted font-bold uppercase">{m.label}</div>
                      <div className="text-xl font-extrabold">{m.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card">
              <h3 className="text-base font-bold mb-6 flex items-center gap-2"><Calendar size={18} /> Vendas Diárias</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} itemStyle={{ color: 'var(--text)' }} formatter={v => fmt(v)} />
                    <Area type="monotone" dataKey="vendas" name="Vendas" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card">
              <h3 className="text-base font-bold mb-6 flex items-center gap-2"><Filter size={18} /> Vendas por Categoria</h3>
              <div className="h-[300px] w-full flex flex-col md:flex-row items-center">
                {categoryData.length === 0 ? (
                  <div className="w-full flex items-center justify-center text-muted text-sm">Sem dados no período</div>
                ) : (
                  <>
                    <div className="flex-1 h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} formatter={v => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-3 w-full md:w-48 pl-4">
                      {categoryData.map((c, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                            <span className="text-xs text-muted">{c.name}</span>
                          </div>
                          <span className="text-xs font-bold">{fmt(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Gráfico Entradas x Saídas x Lançamentos */}
          <div className="glass-card">
            <h3 className="text-base font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} /> Entradas, Saídas e Saldo do Período</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} formatter={v => fmt(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="entradas" name="Entradas" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="saidas" name="Saídas" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card">
              <h3 className="text-base font-bold mb-6">Produtos Mais Vendidos (Qtd.)</h3>
              <div className="h-[260px] w-full">
                {topProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted text-sm">Sem dados no período</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }} />
                      <Tooltip cursor={{ fill: 'var(--surface-2)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabela detalhada */}
            <div className="glass-card overflow-hidden">
              <h3 className="text-base font-bold mb-4 flex items-center gap-2"><ShoppingBag size={18} /> Pedidos Detalhados</h3>
              <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                {periodOrders.length === 0 ? (
                  <div className="text-center py-8 text-muted text-sm">Nenhum pedido no período</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Pedido', 'Data', 'Cliente', 'Pagamento', 'Total'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...periodOrders].reverse().map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover:bg-surface-2 transition-colors">
                          <td style={{ padding: '7px 8px', fontWeight: 700 }}>#{String(o.number || o.id).padStart(4, '0')}</td>
                          <td style={{ padding: '7px 8px', color: 'var(--text-muted)' }}>
                            {o.createdAt ? format(new Date(o.createdAt), 'dd/MM HH:mm') : '—'}
                          </td>
                          <td style={{ padding: '7px 8px', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customerName || 'Balcão'}</td>
                          <td style={{ padding: '7px 8px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{o.payment || '—'}</td>
                          <td style={{ padding: '7px 8px', fontWeight: 700, color: '#10b981' }}>{fmt(o.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Demonstrativo do Resultado do Exercício (DRE)</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Visão gerencial de lucros e perdas no período selecionado</p>
          </div>
          
          <div style={{ padding: '0 32px 32px' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  { label: 'RECEITA BRUTA TOTAL', value: dreData.grossRevenue, isTotal: true },
                  { label: '  Vendas de Produtos/Serviços', value: dreData.orderRevenue },
                  { label: '  Outras Receitas Operacionais', value: dreData.manualRevenue },
                  { label: 'DEDUÇÕES E IMPOSTOS', value: -dreData.deductions, isTotal: true },
                  { label: '  Impostos sobre Faturamento (6%)', value: -dreData.taxes },
                  { label: '  Cancelamentos e Devoluções', value: -dreData.cancellations },
                  { label: 'RECEITA LÍQUIDA', value: dreData.netRevenue, isSubtotal: true },
                  { label: 'CUSTO DAS MERCADORIAS VENDIDAS (CMV)', value: -dreData.cmv, isTotal: true },
                  { label: 'LUCRO BRUTO', value: dreData.grossProfit, isSubtotal: true },
                  { label: 'DESPESAS OPERACIONAIS', value: -dreData.operationalExpenses, isTotal: true },
                  { label: '(=) RESULTADO LÍQUIDO (EBITDA)', value: dreData.ebitda, isFinal: true },
                ].map((row, idx) => (
                  <tr key={idx} style={{ 
                    borderBottom: '1px solid var(--border)',
                    background: row.isSubtotal ? 'var(--surface-2)' : row.isFinal ? 'var(--primary-glow)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '12px 0', 
                      fontSize: (row.isTotal || row.isFinal) ? 14 : 13, 
                      fontWeight: (row.isTotal || row.isSubtotal || row.isFinal) ? 700 : 400,
                      color: (row.isTotal || row.isFinal) ? 'var(--text)' : 'var(--text-muted)',
                      paddingLeft: row.label.startsWith('  ') ? 24 : 0
                    }}>
                      {row.label.trim()}
                    </td>
                    <td style={{ 
                      padding: '12px 0', 
                      textAlign: 'right',
                      fontSize: (row.isTotal || row.isFinal) ? 14 : 13,
                      fontWeight: 800,
                      color: row.value < 0 ? 'var(--danger)' : row.isFinal ? 'var(--primary-light)' : 'var(--text)'
                    }}>
                      {fmt(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div className="glass-card text-center" style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Margem Bruta</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--success)' }}>
                  {((dreData.grossProfit / (dreData.grossRevenue || 1)) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="glass-card text-center" style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Margem Líquida</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-light)' }}>
                  {((dreData.netResult / (dreData.grossRevenue || 1)) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="glass-card text-center" style={{ padding: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Ponto de Equilíbrio</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--warning)' }}>
                  {fmt(dreData.operationalExpenses / (dreData.grossProfit / (dreData.grossRevenue || 1)))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
