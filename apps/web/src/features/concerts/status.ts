export function mapStatus(status: string | undefined | null) {
  const normalized = (status ?? '').toUpperCase();
  switch (normalized) {
    case 'PUBLISHED':
      return {
        label: 'Published',
        badgeClass: 'bg-tertiary/10 text-tertiary border border-tertiary/20',
        dotClass: 'bg-tertiary animate-pulse',
      };
    case 'DRAFT':
      return {
        label: 'Draft',
        badgeClass: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
        dotClass: undefined,
      };
    case 'ENDED':
      return {
        label: 'Ended',
        badgeClass: 'bg-surface-container-high text-on-surface border border-white/10',
        dotClass: undefined,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-error/10 text-error border border-error/20',
        dotClass: undefined,
      };
    default:
      return {
        label: status || 'Unknown',
        badgeClass: 'bg-white/5 text-on-surface-variant border border-white/10',
        dotClass: undefined,
      };
  }
}
