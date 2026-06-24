import { describe, it, expect } from 'vitest';
import { visibleItems } from './sidebar-config';

describe('sidebar-config', () => {
  it('ORGANIZER sees Concerts, Venue Maps and Settings', () => {
    const keys = visibleItems('ORGANIZER').map((i) => i.key);
    expect(keys).toContain('organizer-concerts');
    expect(keys).toContain('organizer-venue-maps');
    expect(keys).toContain('settings');
  });

  it('ORGANIZER does NOT see Dashboard, Staff, or admin paths', () => {
    const keys = visibleItems('ORGANIZER').map((i) => i.key);
    expect(keys).not.toContain('admin-dashboard');
    expect(keys).not.toContain('staff');
    expect(keys).not.toContain('admin-venue-maps');
  });

  it('ADMIN sees Dashboard, Concerts, Venue Maps, Staff, and Settings', () => {
    const keys = visibleItems('ADMIN').map((i) => i.key);
    expect(keys).toContain('admin-dashboard');
    expect(keys).toContain('admin-concerts');
    expect(keys).toContain('admin-venue-maps');
    expect(keys).toContain('staff');
    expect(keys).toContain('settings');
  });

  it('ADMIN does NOT see organizer paths', () => {
    const keys = visibleItems('ADMIN').map((i) => i.key);
    expect(keys).not.toContain('organizer-venue-maps');
    expect(keys).not.toContain('organizer-concerts');
  });
});

