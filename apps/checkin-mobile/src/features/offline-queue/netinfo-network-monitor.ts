import type { NetworkMonitor } from './network-monitor.port';

interface NetInfoState {
  readonly isConnected: boolean | null;
  readonly isInternetReachable: boolean | null;
}

interface NetInfoModule {
  readonly default: {
    fetch(): Promise<NetInfoState>;
    addEventListener(callback: (state: NetInfoState) => void): () => void;
  };
}

export class NetInfoNetworkMonitor implements NetworkMonitor {
  private online = true;
  private readonly module: Promise<NetInfoModule>;

  constructor() {
    const moduleName: string = '@react-native-community/netinfo';
    this.module = import(moduleName) as Promise<NetInfoModule>;
    void this.module.then(({ default: NetInfo }) => NetInfo.fetch()).then((state) => {
      this.online = state.isConnected === true && state.isInternetReachable !== false;
    });
  }

  isOnline(): boolean {
    return this.online;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    void this.module.then(({ default: NetInfo }) => {
      if (!active) return;
      unsubscribe = NetInfo.addEventListener((state) => {
        this.online = state.isConnected === true && state.isInternetReachable !== false;
        callback(this.online);
      });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }
}
