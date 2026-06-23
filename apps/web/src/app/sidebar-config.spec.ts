import { describe, it, expect } from 'vitest';
import { visibleItems } from './sidebar-config';

describe('sidebar-config', () => {
  it('ORGANIZER sees Concerts and Settings', () => {
    const keys = visibleItems('ORGANIZER').map((i) => i.key);
    expect(keys).toContain('concerts');
    expect(keys).toContain('settings');
  });

  it('ORGANIZER does NOT see Dashboard, Staff, or Seating Maps', () => {
    const keys = visibleItems('ORGANIZER').map((i) => i.key);
    expect(keys).not.toContain('dashboard');
    expect(keys).not.toContain('staff');
    expect(keys).not.toContain('seating-maps');
  });

  it('ADMIN sees Dashboard, Concerts, Staff, and Settings', () => {
    const keys = visibleItems('ADMIN').map((i) => i.key);
    expect(keys).toContain('dashboard');
    expect(keys).toContain('concerts');
    expect(keys).toContain('staff');
    expect(keys).toContain('settings');
  });

  it('ADMIN does NOT see global Seating Maps', () => {
    const keys = visibleItems('ADMIN').map((i) => i.key);
    expect(keys).not.toContain('seating-maps');
  });
});
