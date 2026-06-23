import { describe, it, expect } from 'vitest';
import { mapStatus } from './status';

describe('status mapping', () => {
  it('maps known statuses correctly', () => {
    expect(mapStatus('DRAFT').label).toBe('Draft');
    expect(mapStatus('PUBLISHED').label).toBe('Published');
    expect(mapStatus('ENDED').label).toBe('Ended');
    expect(mapStatus('CANCELLED').label).toBe('Cancelled');
  });

  it('handles lowercase/mixed-case known statuses', () => {
    expect(mapStatus('draft').label).toBe('Draft');
    expect(mapStatus('published').label).toBe('Published');
  });

  it('safely handles unknown or empty statuses', () => {
    const fallback = mapStatus('SOMETHING_ELSE');
    expect(fallback.label).toBe('SOMETHING_ELSE');
    expect(fallback.badgeClass).toContain('border-white/10');

    const empty = mapStatus(null);
    expect(empty.label).toBe('Unknown');
  });
});
