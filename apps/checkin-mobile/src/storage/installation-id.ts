const INSTALLATION_ID_KEY = 'ticketbox.checkin.installation-id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface InstallationIdStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
}

export type RandomUuidProvider = () => string | Promise<string>;

export async function getOrCreateInstallationId(
  store?: InstallationIdStore,
  randomUuid: RandomUuidProvider = defaultRandomUuid,
): Promise<string> {
  const secureStore = store ?? (await loadSecureStore());
  const existing = await secureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (existing && UUID_PATTERN.test(existing)) {
    return existing;
  }

  const created = await randomUuid();
  if (!UUID_PATTERN.test(created)) {
    throw new Error('Unable to generate a valid installation identifier');
  }

  await secureStore.setItemAsync(INSTALLATION_ID_KEY, created);
  return created;
}

async function defaultRandomUuid(): Promise<string> {
  const crypto = await import('expo-crypto');
  return crypto.randomUUID();
}

async function loadSecureStore(): Promise<InstallationIdStore> {
  return import('expo-secure-store') as Promise<InstallationIdStore>;
}
