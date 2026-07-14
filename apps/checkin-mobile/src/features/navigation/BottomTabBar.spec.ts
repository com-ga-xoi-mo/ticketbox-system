import { describe, expect, it } from 'vitest';

import { APP_TABS } from './bottom-tab-state';

describe('check-in bottom navigation', () => {
  it('adds VIP beside the existing Scan and Sync tabs without replacing them', () => {
    expect(APP_TABS.map(({ key }) => key)).toEqual(['scan', 'vip', 'sync']);
    expect(APP_TABS.map(({ label }) => label)).toEqual(['Scan', 'VIP', 'Sync']);
  });
});
