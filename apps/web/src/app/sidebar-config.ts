import type { Role } from '../shared/auth/jwt-decode';

export interface SidebarItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  roles: Role[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/dashboard',
    roles: ['ADMIN'],
  },
  {
    key: 'concerts',
    label: 'Concerts',
    icon: 'music_note',
    path: '/concerts',
    roles: ['ORGANIZER', 'ADMIN'],
  },
  { key: 'staff', label: 'Staff', icon: 'people', path: '/staff', roles: ['ADMIN'] },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings',
    path: '/settings',
    roles: ['ORGANIZER', 'ADMIN'],
  },
];

export function visibleItems(role: Role): SidebarItem[] {
  return SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
}
