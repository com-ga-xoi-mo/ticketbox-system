import type { SqliteDatabase } from './sqlite-database.port';
import { openOfflineQueueDatabase } from './expo-sqlite-database';
import { SqliteOfflineScanQueue } from './sqlite-offline-scan-queue';

export interface InitializableOfflineQueue {
  initialize(): Promise<void>;
}

export type OfflineQueueBootstrapState<TQueue> =
  | { readonly status: 'initializing' }
  | { readonly status: 'ready'; readonly queue: TQueue }
  | { readonly status: 'recoverable-error'; readonly message: string };

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
      const queue = this.createQueue(await this.openDatabase());
      await queue.initialize();
      this.currentState = { status: 'ready', queue };
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
