import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import { Payment } from '../../domain/payment.entity';
import { PaymentEventType } from '../../domain/payment-event-type.enum';
import { PaymentStatus } from '../../domain/payment-status.enum';
import type {
  CreatePaymentData,
  PaymentRepositoryPort,
  RecordPaymentEventData,
  RecordPaymentEventResult,
  UpdatePaymentStatusData,
} from '../../domain/ports/payment-repository.port';

interface PrismaPaymentRecord {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  providerTransactionId: string | null;
  status: string;
  amountVnd: number;
  redirectUrl: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

@Injectable()
export class PrismaPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaymentData): Promise<Payment> {
    const payment = await this.prisma.payment.create({
      data: {
        id: data.id,
        orderId: data.orderId,
        userId: data.userId,
        provider: data.provider,
        providerTransactionId: data.providerTransactionId,
        status: data.status,
        amountVnd: data.amountVnd,
        redirectUrl: data.redirectUrl,
        createdAt: data.createdAt,
      },
    });

    await this.recordEvent({
      paymentId: payment.id,
      eventType: PaymentEventType.REDIRECT_CREATED,
      providerTransactionId: payment.providerTransactionId,
      payload: {
        redirectUrl: payment.redirectUrl,
      },
    });

    return this.toDomain(payment);
  }

  async findById(paymentId: string): Promise<Payment | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    return payment ? this.toDomain(payment) : null;
  }

  async findByProviderTransactionId(providerTransactionId: string): Promise<Payment | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerTransactionId },
    });

    return payment ? this.toDomain(payment) : null;
  }

  async recordEvent(data: RecordPaymentEventData): Promise<RecordPaymentEventResult> {
    try {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: data.paymentId,
          eventType: data.eventType,
          providerEventId: data.providerEventId,
          providerTransactionId: data.providerTransactionId,
          payload: data.payload === undefined ? undefined : data.payload,
        },
      });

      return { duplicate: false };
    } catch (err: unknown) {
      if (this.isUniqueConstraintError(err)) {
        return { duplicate: true };
      }
      throw err;
    }
  }

  async updateStatus(data: UpdatePaymentStatusData): Promise<Payment> {
    const payment = await this.prisma.payment.update({
      where: { id: data.paymentId },
      data: {
        status: data.status,
        completedAt: data.completedAt,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
      },
    });

    return this.toDomain(payment);
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
  }

  private toDomain(payment: PrismaPaymentRecord): Payment {
    return new Payment({
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      provider: payment.provider,
      providerTransactionId: payment.providerTransactionId,
      status: payment.status as PaymentStatus,
      amountVnd: payment.amountVnd,
      redirectUrl: payment.redirectUrl,
      failureCode: payment.failureCode,
      failureMessage: payment.failureMessage,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      completedAt: payment.completedAt,
    });
  }
}
