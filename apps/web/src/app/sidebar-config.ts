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
    key: 'admin-dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/admin/dashboard',
    roles: ['ADMIN'],
  },
  {
    key: 'admin-concerts',
    label: 'Concerts',
    icon: 'music_note',
    path: '/admin/concerts',
    roles: ['ADMIN'],
  },
  {
    key: 'admin-venue-maps',
    label: 'Venue Maps',
    icon: 'map',
    path: '/admin/venue-maps',
    roles: ['ADMIN'],
  },
  {
    key: 'organizer-concerts',
    label: 'Concerts',
    icon: 'music_note',
    path: '/organizer/concerts',
    roles: ['ORGANIZER'],
  },
  {
    key: 'organizer-venue-maps',
    label: 'Venue Maps',
    icon: 'map',
    path: '/organizer/venue-maps',
    roles: ['ORGANIZER'],
  },
  { key: 'staff', label: 'Staff', icon: 'people', path: '/staff', roles: ['ADMIN'] },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings',
    path: '/settings',
    roles: ['ORGANIZER', 'ADMIN'], // Could be problematic later, but ignoring for now or leaving as is
  },
];

export function visibleItems(role: Role): SidebarItem[] {
  return SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
}

