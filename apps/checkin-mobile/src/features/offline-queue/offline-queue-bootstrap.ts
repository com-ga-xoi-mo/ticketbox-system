import type { SqliteDatabase } from './sqlite-database.port';
import { openOfflineQueueDatabase } from './expo-sqlite-database';
import { SqliteOfflineScanQueue } from './sqlite-offline-scan-queue';

export interface InitializableOfflineQueue {
  initialize(): Promise<void>;
}

export type OfflineQueueBootstrapState<TQueue> =
  | { readonly status: 'initializing' }
  | { readonly status: 'ready'; readonly queue: TQueue; readonly database: SqliteDatabase }
  | { readonly status: 'recoverable-error'; readonly message: string };

const TICKET_CACHE_DDL = `
  CREATE TABLE IF NOT EXISTS ticket_cache (
    qr_token_hash TEXT NOT NULL,
    staff_user_id TEXT NOT NULL,
    concert_id TEXT NOT NULL,
    status TEXT NOT NULL,
    cached_at TEXT NOT NULL,
    PRIMARY KEY (qr_token_hash, staff_user_id)
  );
`;

export class OfflineQueueBootstrap<
  TQueue extends InitializableOfflineQueue = SqliteOfflineScanQueue,
> {
  private currentState: OfflineQueueBootstrapState<TQueue> = { status: 'initializing' };

  constructor(
    private readonly openDatabase: () => Promise<SqliteDatabase> = openOfflineQueueDatabase,
    private readonly createQueue: (database: SqliteDatabase) => TQueue = ((database: SqliteDatabase) =>
      new SqliteOfflineScanQueue(database)) as unknown as (database: SqliteDatabase) => TQueue,
  ) {}

  get state(): OfflineQueueBootstrapState<TQueue> {
    return this.currentState;
  }

  async initialize(): Promise<OfflineQueueBootstrapState<TQueue>> {
    this.currentState = { status: 'initializing' };
    try {
      const database = await this.openDatabase();
      await database.execAsync(TICKET_CACHE_DDL);
      const queue = this.createQueue(database);
      await queue.initialize();
      this.currentState = { status: 'ready', queue, database };
    } catch (error) {
      this.currentState = {
        status: 'recoverable-error',
        message:
          error instanceof Error ? error.message : 'Unable to initialize the offline database',
      };
    }
    return this.currentState;
  }
}
