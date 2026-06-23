import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuestListImportProcessor } from './guest-list-import.processor';
import { GuestListSchedulerService, isCronDue } from './guest-list-scheduler.service';

afterEach(() => vi.useRealTimers());
describe('guest-list worker wiring', () => {
  it('passes retry finality to processing and keeps the batch ID authoritative', async () => {
    const processImport = { execute: vi.fn().mockResolvedValue({ batchId: 'batch' }) };
    const processor = new GuestListImportProcessor(processImport as never);
    await processor.process({
      data: { version: 1, batchId: 'batch' },
      attemptsMade: 1,
      opts: { attempts: 2 },
    } as never);
    expect(processImport.execute).toHaveBeenCalledWith('batch', true);
  });
  it.each(['out-of-order', 'active lease'])(
    'leaves a %s coordination failure recoverable after the final BullMQ attempt',
    async (message) => {
      const processImport = { execute: vi.fn().mockRejectedValue(new Error(message)) };
      const processor = new GuestListImportProcessor(processImport as never);
      await expect(
        processor.process({
          data: { version: 1, batchId: 'batch' },
          attemptsMade: 2,
          opts: { attempts: 3 },
        } as never),
      ).rejects.toThrow(message);
      expect(processImport.execute).toHaveBeenCalledWith('batch', true);
    },
  );
  it.each([
    ['*/5 * * * *', new Date(2026, 5, 20, 10, 10, 0)],
    ['15 * * * *', new Date(2026, 5, 20, 10, 15, 0)],
    ['0 2 * * *', new Date(2026, 5, 20, 2, 0, 0)],
  ])('evaluates the complete cron expression %s', (expression, dueAt) => {
    expect(isCronDue(expression, dueAt)).toBe(true);
    expect(isCronDue(expression, new Date(dueAt.getTime() + 60_000))).toBe(false);
  });
  it('runs reconciliation independently and discovery only when cron is due', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 20, 10, 9, 0));
    const discovery = { execute: vi.fn().mockResolvedValue([]) };
    const reconcile = { execute: vi.fn().mockResolvedValue(0) };
    const scheduler = new GuestListSchedulerService(
      discovery as never,
      reconcile as never,
      { guestListDiscoveryCron: '*/5 * * * *' } as never,
    );
    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(60_000);
    scheduler.onModuleDestroy();
    expect(reconcile.execute).toHaveBeenCalled();
    expect(discovery.execute).toHaveBeenCalled();
  });
  it('suppresses overlapping discovery ticks', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 20, 10, 9, 0));
    let finishDiscovery!: () => void;
    const discovery = {
      execute: vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finishDiscovery = resolve;
          }),
      ),
    };
    const scheduler = new GuestListSchedulerService(
      discovery as never,
      { execute: vi.fn().mockResolvedValue(0) } as never,
      { guestListDiscoveryCron: '* * * * *' } as never,
    );
    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(discovery.execute).toHaveBeenCalledTimes(1);
    finishDiscovery();
    await Promise.resolve();
    scheduler.onModuleDestroy();
  });
  it('contains an unexpected cron evaluation failure without disabling reconciliation', async () => {
    vi.useFakeTimers();
    const discovery = { execute: vi.fn() };
    const reconcile = { execute: vi.fn().mockResolvedValue(0) };
    const scheduler = new GuestListSchedulerService(
      discovery as never,
      reconcile as never,
      { guestListDiscoveryCron: 'parser-invalid' } as never,
    );
    const logError = vi
      .spyOn((scheduler as never as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined);
    scheduler.onModuleInit();
    await vi.advanceTimersByTimeAsync(60_000);
    scheduler.onModuleDestroy();
    expect(reconcile.execute).toHaveBeenCalledTimes(1);
    expect(discovery.execute).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledWith('Guest-list discovery failed', expect.any(String));
  });
});
