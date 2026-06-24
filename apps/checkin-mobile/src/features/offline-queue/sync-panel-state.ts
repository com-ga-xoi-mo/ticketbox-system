export interface SyncControlsVisibilityInput {
  readonly online: boolean;
  readonly pendingCount: number;
  readonly failedCount: number;
}

/**
 * Pure predicate deciding whether the manual sync + queue-maintenance controls should be
 * shown. They are only actionable when the device is offline or there is queued/failed
 * work, so they stay hidden while online with an empty queue.
 */
export function shouldShowSyncControls(input: SyncControlsVisibilityInput): boolean {
  return !input.online || input.pendingCount > 0 || input.failedCount > 0;
}
