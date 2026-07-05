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
    label: 'Bảng điều khiển',
    icon: 'dashboard',
    path: '/admin/dashboard',
    roles: ['ADMIN'],
  },
  {
    key: 'admin-reports',
    label: 'Báo cáo',
    icon: 'analytics',
    path: '/admin/reports',
    roles: ['ADMIN'],
  },
  {
    key: 'admin-concerts',
    label: 'Sự kiện',
    icon: 'music_note',
    path: '/admin/concerts',
    roles: ['ADMIN'],
  },
  {
    key: 'admin-artists',
    label: 'Nghệ sĩ',
    icon: 'mic',
    path: '/admin/artists',
    roles: ['ADMIN'],
  },
  {
    key: 'admin-venue-maps',
    label: 'Sơ đồ ghế',
    icon: 'map',
    path: '/admin/venue-maps',
    roles: ['ADMIN'],
  },
  {
    key: 'admin-assignments',
    label: 'Phân công',
    icon: 'assignment',
    path: '/admin/assignments',
    roles: ['ADMIN'],
  },
  {
    key: 'organizer-dashboard',
    label: 'Bảng điều khiển',
    icon: 'dashboard',
    path: '/organizer/dashboard',
    roles: ['ORGANIZER'],
  },
  {
    key: 'organizer-concerts',
    label: 'Sự kiện',
    icon: 'music_note',
    path: '/organizer/concerts',
    roles: ['ORGANIZER'],
  },
  {
    key: 'organizer-venue-maps',
    label: 'Sơ đồ ghế',
    icon: 'map',
    path: '/organizer/venue-maps',
    roles: ['ORGANIZER'],
  },
  {
    key: 'organizer-account',
    label: 'Tài khoản',
    icon: 'manage_accounts',
    path: '/organizer/account',
    roles: ['ORGANIZER'],
  },
  {
    key: 'admin-accounts',
    label: 'Tài khoản',
    icon: 'people',
    path: '/admin/accounts',
    roles: ['ADMIN'],
  },
];

export function visibleItems(role: Role): SidebarItem[] {
  return SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
}

