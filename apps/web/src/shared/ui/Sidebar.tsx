import { NavLink } from 'react-router-dom';
import { visibleItems } from '../../app/sidebar-config';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../auth/jwt-decode';
import { cn } from './cn';

export function Sidebar() {
  const { session } = useAuth();
  const role: Role = (session?.roles ?? []).includes('ADMIN') ? 'ADMIN' : 'ORGANIZER';
  const items = visibleItems(role);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container">
      {/* Logo */}
      <div className="border-b border-outline-variant px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-container flex items-center justify-center p-1 shrink-0">
            <img src="/logo.png" alt="TicketBox Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col pt-1">
            <h1 className="font-display font-extrabold text-white text-[24px] tracking-tight leading-none">
              Ticket<span className="gradient-text">Box</span>
            </h1>
            <p className="font-mono text-[10px] text-on-surface-variant mt-1.5 uppercase tracking-[0.15em] leading-none font-bold">
              {role === 'ADMIN' ? 'Admin Terminal' : 'Organizer Terminal'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-4 rounded-xl px-4 py-3 font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'text-primary bg-primary-container/10 border-r-2 border-primary'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5',
              )
            }
          >
            <span className="material-symbols-outlined shrink-0 text-[20px]" aria-hidden="true">
              {item.icon}
            </span>
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
