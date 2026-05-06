import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, ClipboardList, ChefHat, Users } from 'lucide-react';

const items = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/pos', icon: ShoppingCart, label: 'PDV' },
  { to: '/orders', icon: ClipboardList, label: 'Pedidos' },
  { to: '/kitchen', icon: ChefHat, label: 'Cozinha' },
  { to: '/customers', icon: Users, label: 'Clientes' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            flex: 1,
            height: '100%',
            color: isActive ? 'var(--primary-light)' : 'var(--text-muted)',
            fontSize: 10,
            fontWeight: 600,
            transition: 'color 0.15s ease',
          })}
        >
          <item.icon size={20} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
