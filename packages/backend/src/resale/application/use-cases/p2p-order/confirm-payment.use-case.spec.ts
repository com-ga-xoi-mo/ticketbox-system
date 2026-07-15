import { describe, expect, it, vi } from 'vitest';

import type { NotificationRepositoryPort } from '../../../../notification/domain/ports/notification-repository.port';
import type { RealtimeNotificationPublisherPort } from '../../../../notification/domain/ports/realtime-notification-publisher.port';
import type { ObjectStoragePort } from '../../../../platform/storage';
import { PaymentProofImageValidator } from '../../services/payment-proof-image-validator';
import type { IEventPublisher } from '../../../domain/ports/event-publisher.port';
import type {
  IResaleOrderRepository,
  ResaleOrderData,
} from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { ConfirmPaymentUseCase } from './confirm-payment.use-case';

const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function createOrder(overrides: Partial<ResaleOrderData> = {}): ResaleOrderData {
  return {
    id: 'order-1',
    listingId: 'listing-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status: 'RESERVED',
    paymentProofUrl: null,
    disputeReason: null,
    disputeRaisedBy: null,
    resolvedBy: null,
    resolutionNote: null,
    reservedAt: new Date(),
    paymentConfirmedAt: null,
    completedAt: null,
    cancelledAt: null,
    disputedAt: null,
    resolvedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('ConfirmPaymentUseCase', () => {
  it('uploads the bill, saves its S3 URL, and notifies the seller', async () => {
    const order = createOrder();
    const updated = createOrder({
      status: 'PENDING_CONFIRM',
      paymentProofUrl: 'https://assets.example.com/resale/payment-proofs/order-1/proof.png',
    });
    const orderRepo = {
      findById: vi.fn().mockResolvedValue(order),
      updateStatus: vi.fn().mockResolvedValue(updated),
    } as unknown as IResaleOrderRepository;
    const eventPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    } as unknown as IEventPublisher;
    const storage = {
      putObject: vi.fn().mockResolvedValue(undefined),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      getPublicUrl: vi.fn().mockReturnValue(updated.paymentProofUrl),
    } as unknown as ObjectStoragePort;
    const notificationRepo = {
      upsertByDedupeKey: vi.fn().mockResolvedValue({ id: 'notification-1' }),
    } as unknown as NotificationRepositoryPort;
    const realtimePublisher = {
      publishNewNotification: vi.fn().mockResolvedValue(undefined),
    } as unknown as RealtimeNotificationPublisherPort;
    const useCase = new ConfirmPaymentUseCase(
      orderRepo,
      eventPublisher,
      storage,
      notificationRepo,
      realtimePublisher,
      new PaymentProofImageValidator(),
    );

    const result = await useCase.execute({
      orderId: order.id,
      buyerId: order.buyerId,
      fileBuffer: pngBuffer,
      originalName: 'bill.png',
      mimeType: 'image/png',
      sizeBytes: pngBuffer.length,
    });

    expect(result).toBe(updated);
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringMatching(/^resale\/payment-proofs\/order-1\/.+\.png$/),
        content: pngBuffer,
        contentType: 'image/png',
      }),
    );
    expect(orderRepo.updateStatus).toHaveBeenCalledWith(
      order.id,
      'PENDING_CONFIRM',
      expect.objectContaining({ paymentProofUrl: updated.paymentProofUrl }),
    );
    expect(notificationRepo.upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: order.sellerId,
        actionUrl: `/resale/orders/${order.id}`,
      }),
    );
    expect(realtimePublisher.publishNewNotification).toHaveBeenCalledWith(order.sellerId);
  });

  it('does not upload when the actor is not the buyer', async () => {
    const orderRepo = {
      findById: vi.fn().mockResolvedValue(createOrder()),
    } as unknown as IResaleOrderRepository;
    const storage = { putObject: vi.fn() } as unknown as ObjectStoragePort;
    const useCase = new ConfirmPaymentUseCase(
      orderRepo,
      { publish: vi.fn() } as unknown as IEventPublisher,
      storage,
      { upsertByDedupeKey: vi.fn() } as unknown as NotificationRepositoryPort,
      { publishNewNotification: vi.fn() } as unknown as RealtimeNotificationPublisherPort,
      new PaymentProofImageValidator(),
    );

    await expect(
      useCase.execute({
        orderId: 'order-1',
        buyerId: 'another-user',
        fileBuffer: pngBuffer,
        originalName: 'bill.png',
        mimeType: 'image/png',
        sizeBytes: pngBuffer.length,
      }),
    ).rejects.toThrow('Not order buyer.');
    expect(storage.putObject).not.toHaveBeenCalled();
  });
});
