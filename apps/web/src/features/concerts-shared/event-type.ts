export const EVENT_TYPE_LABELS: Record<string, string> = {
  CONCERT: 'Sự kiện âm nhạc',
  WORKSHOP: 'Hội thảo',
  SPORT: 'Thể thao',
  MOVIE: 'Phim ảnh',
  THEATRE: 'Nhà hát',
  VOUCHER: 'Voucher',
};

export function eventTypeLabel(eventType: string | undefined | null): string | null {
  if (!eventType) return null;
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}
