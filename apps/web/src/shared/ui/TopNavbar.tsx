import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useMyProfile } from '../api/profile';
import { resolveAvatarImageUrl } from '../api/client';

interface Crumb {
  label: string;
  path?: string;
}

export function TopNavbar({ breadcrumbs = [] }: { breadcrumbs?: Crumb[] }) {
const { session, logout } = useAuth();
  const { data: profile } = useMyProfile(!!session);
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
  const avatarImageUrl = resolveAvatarImageUrl(profile?.avatarAssetId, profile?.avatarUrl);

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
            {avatarImageUrl ? (
              <img
                src={avatarImageUrl}
                alt="Profile avatar"
                className="size-8 rounded-full border border-white/20 object-cover transition-colors group-hover:border-primary"
              />
            ) : (
              <div className="size-8 rounded-full border border-white/20 bg-surface-container-high flex items-center justify-center transition-colors group-hover:border-primary">
                <span className="text-xs font-medium text-white">
                  {profile?.displayName ? profile.displayName.substring(0, 2).toUpperCase() : role.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-on-surface transition-colors group-hover:text-primary">
              {profile?.displayName || role}
            </span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-xl">
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white">{profile?.displayName || role}</p>
                <p className="text-xs text-slate-400 truncate">{profile?.email || 'Loading...'}</p>
              </div>
              <div className="py-1">
                <Link
                  to={session?.roles?.includes('ADMIN') ? '/admin/account' : '/organizer/account'}
                  onClick={() => setDropdownOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  Settings
                </Link>
                <div className="h-px bg-white/10 my-1" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
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
