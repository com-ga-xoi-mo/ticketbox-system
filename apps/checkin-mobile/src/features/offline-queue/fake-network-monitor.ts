import type { NetworkMonitor } from './network-monitor.port';

export class FakeNetworkMonitor implements NetworkMonitor {
  private readonly listeners = new Set<(online: boolean) => void>();

  constructor(private online = true) {}

  isOnline(): boolean {
    return this.online;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  setOnline(online: boolean): void {
    this.online = online;
    for (const listener of this.listeners) listener(online);
  }
}
