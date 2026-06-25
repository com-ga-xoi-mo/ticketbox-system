import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { GuestListBatchNotCompletedError } from '../../domain/errors';
import { Role } from '../../../identity/domain/role.enum';
import { AdminGuestListController } from './admin-guest-list.controller';

const user = { id: 'admin', email: 'admin@ticketbox.test', roles: [Role.ADMIN] };
describe('AdminGuestListController', () => {
  it('returns canonical idempotent outcomes and delegates protected reads/reports', async () => {
    const claim = {
      execute: vi
        .fn()
        .mockResolvedValue({ outcome: 'IDEMPOTENT_DUPLICATE', batch: { id: 'batch' } }),
    };
    const discovery = { execute: vi.fn().mockResolvedValue([]) };
    const batches = {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ id: 'batch' }),
      report: vi.fn().mockResolvedValue(Buffer.from('{"batchId":"batch"}')),
    };
    const authorize = { execute: vi.fn() };
    const controller = new AdminGuestListController(
      claim as never,
      discovery as never,
      batches as never,
      authorize as never,
    );
    await expect(
      controller.requestImport(
        'concert',
        {
          sourceName: 'vip.csv',
          contentType: 'text/csv',
          contentBase64: Buffer.from('csv').toString('base64'),
        },
        { user },
      ),
    ).resolves.toMatchObject({ outcome: 'IDEMPOTENT_DUPLICATE' });
    expect(authorize.execute).toHaveBeenCalled();
    await expect(controller.report('concert', 'batch', { user })).resolves.toEqual({
      batchId: 'batch',
    });
  });

  it('returns 422 with structured body when batch is not completed', async () => {
    const claim = { execute: vi.fn() };
    const discovery = { execute: vi.fn() };
    const batches = {
      list: vi.fn(),
      get: vi.fn(),
      report: vi.fn().mockRejectedValue(
        new GuestListBatchNotCompletedError('batch-1', 'FAILED'),
      ),
    };
    const authorize = { execute: vi.fn() };
    const controller = new AdminGuestListController(
      claim as never,
      discovery as never,
      batches as never,
      authorize as never,
    );
    await expect(controller.report('concert', 'batch-1', { user })).rejects.toThrow(
      UnprocessableEntityException,
    );
    try {
      await controller.report('concert', 'batch-1', { user });
    } catch (error) {
      const response = (error as UnprocessableEntityException).getResponse();
      expect(response).toMatchObject({
        error: 'BATCH_NOT_COMPLETED',
        status: 'FAILED',
      });
    }
  });
});
