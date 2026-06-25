import { describe, it, expect } from 'vitest';
import { visibleItems } from './sidebar-config';

describe('sidebar-config', () => {
  it('ORGANIZER sees Dashboard, Concerts, and Venue Maps', () => {
    const keys = visibleItems('ORGANIZER').map((i) => i.key);
    expect(keys).toContain('organizer-dashboard');
    expect(keys).toContain('organizer-concerts');
    expect(keys).toContain('organizer-venue-maps');
  });

  it('ORGANIZER does NOT see admin paths', () => {
    const keys = visibleItems('ORGANIZER').map((i) => i.key);
    expect(keys).not.toContain('admin-dashboard');
    expect(keys).not.toContain('admin-reports');
    expect(keys).not.toContain('admin-accounts');
    expect(keys).not.toContain('admin-assignments');
    expect(keys).not.toContain('admin-venue-maps');
  });

  it('ADMIN sees Dashboard, Reports, Concerts, Venue Maps, Accounts, and Assignments', () => {
    const keys = visibleItems('ADMIN').map((i) => i.key);
    expect(keys).toContain('admin-dashboard');
    expect(keys).toContain('admin-reports');
    expect(keys).toContain('admin-concerts');
    expect(keys).toContain('admin-venue-maps');
    expect(keys).toContain('admin-accounts');
    expect(keys).toContain('admin-assignments');
  });

  it('ADMIN does NOT see organizer paths', () => {
    const keys = visibleItems('ADMIN').map((i) => i.key);
    expect(keys).not.toContain('organizer-venue-maps');
    expect(keys).not.toContain('organizer-concerts');
  });
});

