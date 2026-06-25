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
    key: 'admin-reports',
    label: 'Reports',
    icon: 'analytics',
    path: '/admin/reports',
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
    key: 'admin-assignments',
    label: 'Assignments',
    icon: 'assignment',
    path: '/admin/assignments',
    roles: ['ADMIN'],
  },
  {
    key: 'organizer-dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/organizer/dashboard',
    roles: ['ORGANIZER'],
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
  {
    key: 'admin-accounts',
    label: 'Staff Accounts',
    icon: 'people',
    path: '/admin/accounts',
    roles: ['ADMIN'],
  },
];

export function visibleItems(role: Role): SidebarItem[] {
  return SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
}

