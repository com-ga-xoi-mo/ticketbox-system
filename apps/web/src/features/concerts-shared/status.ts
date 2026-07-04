export function mapStatus(status: string | undefined | null) {
  const normalized = (status ?? '').toUpperCase();
  switch (normalized) {
    case 'PUBLISHED':
      return {
        label: 'Đang bán',
        variant: 'success' as const,
        dotClass: 'bg-tertiary animate-pulse',
      };
    case 'DRAFT':
      return {
        label: 'Bản nháp',
        variant: 'warning' as const,
        dotClass: undefined,
      };
    case 'ENDED':
      return {
        label: 'Đã kết thúc',
        variant: 'muted' as const,
        dotClass: undefined,
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        variant: 'destructive' as const,
        dotClass: undefined,
      };
    default:
      return {
        label: status || 'Không rõ',
        variant: 'muted' as const,
        dotClass: undefined,
      };
  }
}
