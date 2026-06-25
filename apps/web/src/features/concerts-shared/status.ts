export function mapStatus(status: string | undefined | null) {
  const normalized = (status ?? '').toUpperCase();
  switch (normalized) {
    case 'PUBLISHED':
      return {
        label: 'Published',
        variant: 'success' as const,
        dotClass: 'bg-tertiary animate-pulse',
      };
    case 'DRAFT':
      return {
        label: 'Draft',
        variant: 'warning' as const,
        dotClass: undefined,
      };
    case 'ENDED':
      return {
        label: 'Ended',
        variant: 'muted' as const,
        dotClass: undefined,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        variant: 'destructive' as const,
        dotClass: undefined,
      };
    default:
      return {
        label: status || 'Unknown',
        variant: 'muted' as const,
        dotClass: undefined,
      };
  }
}
