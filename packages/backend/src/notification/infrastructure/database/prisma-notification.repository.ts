import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

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
  NotificationResourceType,
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
        actionUrl: input.actionUrl ?? null,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        metadata:
          input.metadata === undefined
            ? undefined
            : input.metadata === null
              ? Prisma.JsonNull
              : (input.metadata as Prisma.InputJsonValue),
        readAt: input.readAt ?? null,
        scheduledAt: input.scheduledAt ?? null,
        sentAt: input.sentAt ?? null,
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

  async listInbox(input: {
    userId: string;
    unreadOnly?: boolean;
    type?: string;
  }): Promise<NotificationRecord[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        ...(input.unreadOnly ? { readAt: null } : {}),
        ...(input.type ? { type: input.type } : {}),
      },
      include: { attempts: true },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((notification) => this.toNotificationRecord(notification));
  }

  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
    });
  }

  async markRead(input: {
    userId: string;
    notificationId: string;
    readAt: Date;
  }): Promise<NotificationRecord | null> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: input.notificationId,
        userId: input.userId,
      },
      data: {
        readAt: input.readAt,
      },
    });

    if (result.count !== 1) return null;
    return this.findById(input.notificationId);
  }

  async markAllRead(input: { userId: string; readAt: Date }): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: input.userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: {
        readAt: input.readAt,
      },
    });
    return result.count;
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
    actionUrl: string | null;
    resourceType: string | null;
    resourceId: string | null;
    metadata: unknown;
    readAt: Date | null;
    scheduledAt: Date | null;
    sentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    attempts?: Array<{ status: string }>;
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
      actionUrl: notification.actionUrl,
      resourceType: notification.resourceType as NotificationResourceType | null,
      resourceId: notification.resourceId,
      metadata: notification.metadata,
      readAt: notification.readAt,
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      failedAttemptCount: (notification.attempts ?? []).filter(
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
