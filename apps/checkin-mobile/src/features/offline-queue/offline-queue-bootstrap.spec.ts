import { describe, expect, it, vi } from 'vitest';

import type { SqliteDatabase } from './sqlite-database.port';
import { OfflineQueueBootstrap } from './offline-queue-bootstrap';

const database = { execAsync: vi.fn(async () => undefined) } as unknown as SqliteDatabase;

describe('OfflineQueueBootstrap', () => {
  it('surfaces database open failure and succeeds on explicit retry', async () => {
    const openDatabase = vi
      .fn<() => Promise<SqliteDatabase>>()
      .mockRejectedValueOnce(new Error('SQLite open failed'))
      .mockResolvedValueOnce(database);
    const queue = { initialize: vi.fn(async () => undefined) };
    const bootstrap = new OfflineQueueBootstrap(openDatabase, () => queue);

    await expect(bootstrap.initialize()).resolves.toEqual({
      status: 'recoverable-error',
      message: 'SQLite open failed',
    });
    expect(bootstrap.state.status).toBe('recoverable-error');

    await expect(bootstrap.initialize()).resolves.toEqual({ status: 'ready', queue, database });
    expect(openDatabase).toHaveBeenCalledTimes(2);
    expect(queue.initialize).toHaveBeenCalledOnce();
  });

  it('surfaces migration failure without claiming the queue is ready', async () => {
    const queue = { initialize: vi.fn(async () => Promise.reject(new Error('Migration failed'))) };
    const bootstrap = new OfflineQueueBootstrap(async () => database, () => queue);
    await expect(bootstrap.initialize()).resolves.toEqual({
      status: 'recoverable-error',
      message: 'Migration failed',
    });
  });
});
