import { describe, it, expect } from 'vitest';
import { mapStatus } from './status';

describe('status mapping', () => {
  it('maps known statuses correctly', () => {
    expect(mapStatus('DRAFT').label).toBe('Bản nháp');
    expect(mapStatus('PUBLISHED').label).toBe('Đang bán');
    expect(mapStatus('ENDED').label).toBe('Đã kết thúc');
    expect(mapStatus('CANCELLED').label).toBe('Đã hủy');
  });

  it('handles lowercase/mixed-case known statuses', () => {
    expect(mapStatus('draft').label).toBe('Bản nháp');
    expect(mapStatus('published').label).toBe('Đang bán');
  });

  it('safely handles unknown or empty statuses', () => {
    const fallback = mapStatus('SOMETHING_ELSE');
    expect(fallback.label).toBe('SOMETHING_ELSE');
    expect(fallback.variant).toBe('muted');

    const empty = mapStatus(null);
    expect(empty.label).toBe('Không rõ');
  });
});
