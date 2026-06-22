import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  NotificationRepositoryPort,
  RecordDeliveryAttemptInput,
  UpdateNotificationStatusInput,
  UpsertNotificationInput,
} from '../../domain/ports/notification-repository.port';
import {
  NotificationAttemptStatus,
  NotificationChannel,
  NotificationStatus,
  type DeliveryAttemptRecord,
  type NotificationRecord,
} from '../../domain/notification.types';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByDedupeKey(input: UpsertNotificationInput): Promise<NotificationRecord> {
    const notification = await this.prisma.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      update: {},
      create: {
        userId: input.userId,
        concertId: input.concertId ?? null,
        channel: input.channel,
        type: input.type,
        dedupeKey: input.dedupeKey,
        status: input.status,
        subject: input.subject ?? null,
        body: input.body,
        scheduledAt: input.scheduledAt ?? null,
        sentAt: input.sentAt ?? null,
      },
      include: {
        attempts: true,
      },
    });

    return this.toNotificationRecord(notification);
  }

  async findById(notificationId: string): Promise<NotificationRecord | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        attempts: true,
      },
    });

    return notification ? this.toNotificationRecord(notification) : null;
  }

  async recordDeliveryAttempt(input: RecordDeliveryAttemptInput): Promise<DeliveryAttemptRecord> {
    const attempt = await this.prisma.notificationAttempt.create({
      data: {
        notificationId: input.notificationId,
        status: input.status,
        provider: input.provider ?? null,
        providerMessageId: input.providerMessageId ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });

    return this.toDeliveryAttemptRecord(attempt);
  }

  async updateStatus(input: UpdateNotificationStatusInput): Promise<NotificationRecord> {
    const notification = await this.prisma.notification.update({
      where: { id: input.notificationId },
      data: {
        status: input.status,
        sentAt: input.sentAt,
      },
      include: {
        attempts: true,
      },
    });

    return this.toNotificationRecord(notification);
  }

  private toNotificationRecord(notification: {
    id: string;
    userId: string;
    concertId: string | null;
    channel: string;
    type: string;
    dedupeKey: string;
    status: string;
    subject: string | null;
    body: string;
    scheduledAt: Date | null;
    sentAt: Date | null;
    attempts: Array<{ status: string }>;
  }): NotificationRecord {
    return {
      id: notification.id,
      userId: notification.userId,
      concertId: notification.concertId,
      channel: notification.channel as NotificationChannel,
      type: notification.type,
      dedupeKey: notification.dedupeKey,
      status: notification.status as NotificationStatus,
      subject: notification.subject,
      body: notification.body,
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      failedAttemptCount: notification.attempts.filter(
        (attempt) => attempt.status === NotificationAttemptStatus.FAILED,
      ).length,
    };
  }

  private toDeliveryAttemptRecord(attempt: {
    id: string;
    notificationId: string;
    status: string;
    provider: string | null;
    providerMessageId: string | null;
    errorMessage: string | null;
    attemptedAt: Date;
  }): DeliveryAttemptRecord {
    return {
      id: attempt.id,
      notificationId: attempt.notificationId,
      status: attempt.status as NotificationAttemptStatus,
      provider: attempt.provider,
      providerMessageId: attempt.providerMessageId,
      errorMessage: attempt.errorMessage,
      attemptedAt: attempt.attemptedAt,
    };
  }
}
