import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IResaleOrderRepository,
  RESALE_ORDER_REPOSITORY,
} from '../../../domain/ports/p2p-order/resale-order-repository.port';
import { IEventPublisher, EVENT_PUBLISHER } from '../../../domain/ports/event-publisher.port';
import { OBJECT_STORAGE, ObjectStoragePort } from '../../../../platform/storage';
import { randomUUID } from 'node:crypto';
import { PaymentProofImageValidator } from '../../services/payment-proof-image-validator';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepositoryPort,
} from '../../../../notification/domain/ports/notification-repository.port';
import {
  REALTIME_NOTIFICATION_PUBLISHER,
  RealtimeNotificationPublisherPort,
} from '../../../../notification/domain/ports/realtime-notification-publisher.port';
import {
  NotificationChannel,
  NotificationResourceType,
  NotificationStatus,
  NotificationType,
} from '../../../../notification/domain/notification.types';
import * as errors from '../../../domain/errors';

export interface ConfirmPaymentCommand {
  orderId: string;
  buyerId: string;
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class ConfirmPaymentUseCase {
  private readonly logger = new Logger(ConfirmPaymentUseCase.name);

  constructor(
    @Inject(RESALE_ORDER_REPOSITORY) private readonly orderRepo: IResaleOrderRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStoragePort,
    @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: NotificationRepositoryPort,
    @Inject(REALTIME_NOTIFICATION_PUBLISHER)
    private readonly realtimeNotificationPublisher: RealtimeNotificationPublisherPort,
    private readonly paymentProofValidator: PaymentProofImageValidator,
  ) {}

  async execute(command: ConfirmPaymentCommand) {
    const order = await this.orderRepo.findById(command.orderId);
    if (!order) {
      throw new errors.OrderNotFoundError();
    }

    if (order.buyerId !== command.buyerId) {
      throw new errors.NotOrderBuyerError();
    }

    if (order.status !== 'RESERVED') {
      throw new errors.InvalidOrderStateError();
    }

    const validated = this.paymentProofValidator.validate(command);
    const storageKey = `resale/payment-proofs/${order.id}/${randomUUID()}.${validated.extension}`;

    await this.storage.putObject({
      key: storageKey,
      content: command.fileBuffer,
      contentType: validated.contentType,
    });
    const paymentProofUrl = this.storage.getPublicUrl(storageKey);

    let updated;
    try {
      updated = await this.orderRepo.updateStatus(order.id, 'PENDING_CONFIRM', {
        paymentProofUrl,
        paymentConfirmedAt: new Date(),
      });
    } catch (error) {
      await this.storage.deleteObject(storageKey).catch(() => undefined);
      throw error;
    }

    // Enqueue expiry job (2 hours)
    await this.eventPublisher.publish(
      'expire-confirm-order',
      { orderId: order.id },
      { delay: 2 * 60 * 60 * 1000 },
    );

    await this.notifySeller(order.sellerId, order.id, paymentProofUrl);

    return updated;
  }

  private async notifySeller(
    sellerId: string,
    orderId: string,
    paymentProofUrl: string,
  ): Promise<void> {
    try {
      await this.notificationRepo.upsertByDedupeKey({
        userId: sellerId,
        channel: NotificationChannel.IN_APP,
        type: NotificationType.RESALE_PAYMENT_PROOF_UPLOADED,
        dedupeKey: `resale-payment-proof:${orderId}`,
        status: NotificationStatus.SENT,
        subject: 'Người mua đã tải bill chuyển khoản',
        body: 'Vui lòng kiểm tra bill và tài khoản ngân hàng trước khi xác nhận đã nhận tiền.',
        actionUrl: `/resale/orders/${orderId}`,
        resourceType: NotificationResourceType.ORDER,
        resourceId: orderId,
        metadata: { paymentProofUrl },
        sentAt: new Date(),
      });
      await this.realtimeNotificationPublisher.publishNewNotification(sellerId);
    } catch (error) {
      this.logger.warn(
        `Không thể gửi thông báo bill resale cho người bán của order ${orderId}`,
        error,
      );
    }
  }
}
