import { describe, expect, it, vi } from 'vitest';

import { getOrCreateInstallationId, type InstallationIdStore } from './installation-id';

const uuid = '99999999-9999-4999-8999-999999999999';

function store(
  initial: string | null,
): InstallationIdStore & { setItemAsync: ReturnType<typeof vi.fn> } {
  return {
    getItemAsync: vi.fn().mockResolvedValue(initial),
    setItemAsync: vi.fn().mockResolvedValue(undefined),
  };
}

describe('getOrCreateInstallationId', () => {
  it('reuses a valid installation identifier across sessions', async () => {
    const secureStore = store(uuid);
    await expect(
      getOrCreateInstallationId(secureStore, () => {
        throw new Error('not used');
      }),
    ).resolves.toBe(uuid);
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('creates and persists a random UUID when missing or invalid', async () => {
    const secureStore = store('invalid');
    await expect(getOrCreateInstallationId(secureStore, () => uuid)).resolves.toBe(uuid);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'ticketbox.checkin.installation-id',
      uuid,
    );
  });

  it('fails instead of using a fixed fallback when generation or persistence fails', async () => {
    await expect(getOrCreateInstallationId(store(null), () => 'fixed-device')).rejects.toThrow(
      'valid installation',
    );
    const failingStore = store(null);
    failingStore.setItemAsync.mockRejectedValue(new Error('storage failed'));
    await expect(getOrCreateInstallationId(failingStore, () => uuid)).rejects.toThrow(
      'storage failed',
    );
  });
});
