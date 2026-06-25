import type { SqliteDatabase, SqliteRunResult } from './sqlite-database.port';

export async function openOfflineQueueDatabase(): Promise<SqliteDatabase> {
  const moduleName: string = 'expo-sqlite';
  const SQLite = (await import(moduleName)) as {
    openDatabaseAsync(name: string): Promise<{
      execAsync(sql: string): Promise<void>;
      runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
      getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
      withTransactionAsync(task: () => Promise<void>): Promise<void>;
    }>;
  };
  const database = await SQLite.openDatabaseAsync('ticketbox-checkin.db');
  return {
    execAsync: (sql) => database.execAsync(sql),
    runAsync: async (sql, ...params): Promise<SqliteRunResult> => {
      const result = await database.runAsync(sql, ...params);
      return { changes: result.changes };
    },
    getAllAsync: (sql, ...params) => database.getAllAsync(sql, ...params),
    withTransactionAsync: (task) => database.withTransactionAsync(task),
  };
}
