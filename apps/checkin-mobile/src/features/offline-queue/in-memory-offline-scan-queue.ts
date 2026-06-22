import type {
  NewOfflineScanEvent,
  OfflineScanEvent,
  OfflineScanQueue,
} from './offline-scan-queue.port';

export class InMemoryOfflineScanQueue implements OfflineScanQueue {
  readonly events = new Map<string, OfflineScanEvent>();

  async enqueue(event: NewOfflineScanEvent): Promise<void> {
    if (this.events.has(event.localId)) throw new Error('Duplicate local scan event');
    this.events.set(event.localId, { ...event, syncStatus: 'pending' });
  }

  async getPendingScanEvents(staffUserId: string, limit: number): Promise<OfflineScanEvent[]> {
    return [...this.events.values()]
      .filter((event) => event.staffUserId === staffUserId && event.syncStatus === 'pending')
      .sort((left, right) => left.scannedAt.localeCompare(right.scannedAt))
      .slice(0, Math.min(100, Math.max(0, limit)));
  }

  async getFailedScanEvents(staffUserId: string): Promise<OfflineScanEvent[]> {
    return [...this.events.values()].filter(
      (event) => event.staffUserId === staffUserId && event.syncStatus === 'failed',
    );
  }

  async markSynced(staffUserId: string, localId: string, syncedAt: string): Promise<void> {
    this.updateOwned(staffUserId, localId, (event) => ({ ...event, syncStatus: 'synced', syncedAt }));
  }

  async markFailed(
    staffUserId: string,
    localId: string,
    terminalStatus: 'invalid' | 'conflict' | 'unassigned',
    failureReason: string,
  ): Promise<void> {
    this.updateOwned(staffUserId, localId, (event) => ({
      ...event,
      syncStatus: 'failed',
      terminalStatus,
      failureReason,
    }));
  }

  async getPendingCount(staffUserId: string): Promise<number> {
    return [...this.events.values()].filter(
      (event) => event.staffUserId === staffUserId && event.syncStatus === 'pending',
    ).length;
  }

  async clearSynced(staffUserId: string): Promise<void> {
    this.clearOwned(staffUserId, 'synced');
  }

  async clearTerminalResults(staffUserId: string): Promise<void> {
    this.clearOwned(staffUserId, 'failed');
  }

  private updateOwned(
    staffUserId: string,
    localId: string,
    update: (event: OfflineScanEvent) => OfflineScanEvent,
  ): void {
    const event = this.events.get(localId);
    if (event?.staffUserId === staffUserId) this.events.set(localId, update(event));
  }

  private clearOwned(staffUserId: string, status: OfflineScanEvent['syncStatus']): void {
    for (const [localId, event] of this.events) {
      if (event.staffUserId === staffUserId && event.syncStatus === status) this.events.delete(localId);
    }
  }
}
