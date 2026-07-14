export type AppTab = 'scan' | 'vip' | 'sync';

export const APP_TABS: ReadonlyArray<{ key: AppTab; label: string; icon: string }> = [
  { key: 'scan', label: 'Scan', icon: 'line-scan' },
  { key: 'vip', label: 'VIP', icon: 'account-search' },
  { key: 'sync', label: 'Sync', icon: 'sync' },
];
