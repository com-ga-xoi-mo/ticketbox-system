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
    // Must be a STRING LITERAL: Metro collects dependencies by static analysis of
    // import() calls and only bundles literal arguments. A variable module name
    // (`import(moduleName)`) is silently dropped from the bundle and rejects at
    // runtime, leaving `online` stuck at `true` so the app never detects offline.
    this.module = import('@react-native-community/netinfo') as unknown as Promise<NetInfoModule>;
    void this.module
      .then(({ default: NetInfo }) => NetInfo.fetch())
      .then((state) => {
        this.online = state.isConnected === true && state.isInternetReachable !== false;
      })
      .catch((error) => {
        // Surface the failure instead of silently pretending we are online.
        console.warn('[NetInfo] failed to initialize network monitor', error);
      });
  }

  isOnline(): boolean {
    return this.online;
  }

  onStatusChange(callback: (online: boolean) => void): () => void {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    void this.module
      .then(({ default: NetInfo }) => {
        if (!active) return;
        unsubscribe = NetInfo.addEventListener((state) => {
          this.online = state.isConnected === true && state.isInternetReachable !== false;
          callback(this.online);
        });
      })
      .catch((error) => {
        console.warn('[NetInfo] failed to subscribe to network changes', error);
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }
}
