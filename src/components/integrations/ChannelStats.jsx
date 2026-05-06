import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Percent } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const DATA = [
  { name: 'iFood', sales: 4500, orders: 124, fee: 810 },
  { name: 'M. Livre', sales: 3200, orders: 45, fee: 480 },
  { name: 'Shopee', sales: 2100, orders: 38, fee: 315 },
  { name: 'Site', sales: 1500, orders: 22, fee: 45 },
];

const PIE_DATA = [
  { name: 'iFood', value: 45, color: '#EA1D2C' },
  { name: 'M. Livre', value: 30, color: '#FFE600' },
  { name: 'Shopee', value: 15, color: '#EE4D2D' },
  { name: 'Site', value: 10, color: '#7C3AED' },
];

export default function ChannelStats() {
  const { activeCompanyId } = useApp();

  return (
    <div className="animate-in fade-in duration-500">
      <div className="grid-4 mb-6">
        {[
          { label: 'Faturamento Total', val: 'R$ 11.300', icon: DollarSign, color: 'var(--success)' },
          { label: 'Total Pedidos', val: '229', icon: ShoppingCart, color: 'var(--info)' },
          { label: 'Ticket Médio', val: 'R$ 49,34', icon: TrendingUp, color: 'var(--primary-light)' },
          { label: 'Taxa Média', val: '14.5%', icon: Percent, color: 'var(--warning)' },
        ].map(stat => (
          <div key={stat.label} className="glass-card">
            <div className="flex items-center gap-3">
              <div style={{ padding: 8, borderRadius: 8, background: 'var(--surface-3)' }}>
                <stat.icon size={18} color={stat.color} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{stat.val}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 20, fontSize: 14 }}>Vendas por Canal (R$)</h4>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}
                  itemStyle={{ color: 'var(--primary-light)' }}
                />
                <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 20, fontSize: 14 }}>Participação no Volume</h4>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card mt-6">
        <h4 style={{ fontWeight: 700, marginBottom: 20, fontSize: 14 }}>Comparativo de Taxas por Canal</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="w-full">
            <thead style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Canal</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Bruto</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Taxas (Marketplace)</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Líquido Estimado</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Margem Média</th>
              </tr>
            </thead>
            <tbody>
              {DATA.map(item => (
                <tr key={item.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px', fontWeight: 700 }}>{item.name}</td>
                  <td style={{ padding: '16px' }}>R$ {item.sales.toLocaleString()}</td>
                  <td style={{ padding: '16px', color: 'var(--danger)' }}>- R$ {item.fee.toLocaleString()}</td>
                  <td style={{ padding: '16px', color: 'var(--success)', fontWeight: 700 }}>R$ {(item.sales - item.fee).toLocaleString()}</td>
                  <td style={{ padding: '16px' }}>
                    <div className="flex items-center gap-2">
                       <div style={{ flex: 1, height: 4, background: 'var(--surface-3)', borderRadius: 2, maxWidth: 60 }}>
                          <div style={{ width: `${((item.sales - item.fee) / item.sales * 100).toFixed(0)}%`, height: '100%', background: 'var(--success)', borderRadius: 2 }} />
                       </div>
                       <span style={{ fontSize: 11 }}>{((item.sales - item.fee) / item.sales * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
