export interface NetworkMonitor {
  isOnline(): boolean;
  onStatusChange(callback: (online: boolean) => void): () => void;
}
