import { describe, expect, it } from 'vitest';

import { shouldShowSyncControls } from './sync-panel-state';

describe('shouldShowSyncControls', () => {
  it('hides controls when online with an empty queue', () => {
    expect(shouldShowSyncControls({ online: true, pendingCount: 0, failedCount: 0 })).toBe(false);
  });

  it('shows controls when offline', () => {
    expect(shouldShowSyncControls({ online: false, pendingCount: 0, failedCount: 0 })).toBe(true);
  });

  it('shows controls when there are pending events even if online', () => {
    expect(shouldShowSyncControls({ online: true, pendingCount: 3, failedCount: 0 })).toBe(true);
  });

  it('shows controls when there are failed events even if online', () => {
    expect(shouldShowSyncControls({ online: true, pendingCount: 0, failedCount: 2 })).toBe(true);
  });
});
