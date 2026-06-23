import type { MobileSession } from '../api/checkin-mobile-api.types';

export interface SessionStore {
  getSession(): Promise<MobileSession | null>;
  saveSession(session: MobileSession): Promise<void>;
  clearSession(): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  private session: MobileSession | null;

  constructor(initialSession: MobileSession | null = null) {
    this.session = initialSession;
  }

  async getSession(): Promise<MobileSession | null> {
    return this.session;
  }

  async saveSession(session: MobileSession): Promise<void> {
    this.session = session;
  }

  async clearSession(): Promise<void> {
    this.session = null;
  }
}

type SecureStoreModule = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export class ExpoSecureSessionStore implements SessionStore {
  constructor(private readonly storageKey = 'ticketbox.checkin.session') {}

  async getSession(): Promise<MobileSession | null> {
    const secureStore = await loadSecureStore();
    const rawValue = await secureStore.getItemAsync(this.storageKey);
    return rawValue ? (JSON.parse(rawValue) as MobileSession) : null;
  }

  async saveSession(session: MobileSession): Promise<void> {
    const secureStore = await loadSecureStore();
    await secureStore.setItemAsync(this.storageKey, JSON.stringify(session));
  }

  async clearSession(): Promise<void> {
    const secureStore = await loadSecureStore();
    await secureStore.deleteItemAsync(this.storageKey);
  }
}

async function loadSecureStore(): Promise<SecureStoreModule> {
  return import('expo-secure-store') as Promise<SecureStoreModule>;
}
