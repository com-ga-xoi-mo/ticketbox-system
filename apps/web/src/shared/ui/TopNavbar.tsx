import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface Crumb {
  label: string;
  path?: string;
}

export function TopNavbar({ breadcrumbs = [] }: { breadcrumbs?: Crumb[] }) {
  const { session, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const role = session?.roles?.includes('ADMIN') ? 'Admin' : 'Organizer';

  return (
    <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-white/10 bg-surface/70 px-8 backdrop-blur-md">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link to="/" className="text-on-surface-variant transition-colors hover:text-primary">
          Console
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <span
              className="material-symbols-outlined text-[14px] text-on-surface-variant/40"
              aria-hidden="true"
            >
              chevron_right
            </span>
            {crumb.path && i < breadcrumbs.length - 1 ? (
              <Link
                to={crumb.path}
                className="text-on-surface-variant transition-colors hover:text-primary"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-on-surface">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1 text-on-surface-variant">
          {/* Notifications */}
          <button
            className="relative rounded-full p-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-secondary"
              aria-hidden="true"
            />
          </button>
          {/* Help */}
          <button
            className="rounded-full p-2 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Help"
          >
            <span className="material-symbols-outlined text-[22px]">help_outline</span>
          </button>
        </div>

        <div className="h-6 w-px bg-white/10" aria-hidden="true" />

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="group flex items-center gap-2.5 rounded-full px-2 py-1 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}&backgroundColor=171f33`}
              alt="Profile avatar"
              className="size-8 rounded-full border border-white/20 bg-surface-container-high object-cover transition-colors group-hover:border-primary"
            />
            <span className="text-sm font-medium text-on-surface transition-colors group-hover:text-primary">
              {role}
            </span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-surface-container-high shadow-xl">
              <div className="py-1">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
