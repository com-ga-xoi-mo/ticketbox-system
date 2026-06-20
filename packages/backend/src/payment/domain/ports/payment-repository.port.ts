import type { Prisma } from '@prisma/client';

import type { Payment } from '../payment.entity';
import type { PaymentEventType } from '../payment-event-type.enum';
import type { PaymentStatus } from '../payment-status.enum';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface CreatePaymentData {
  id: string;
  orderId: string;
  userId: string;
  provider: string;
  providerTransactionId: string;
  status: PaymentStatus;
  amountVnd: number;
  redirectUrl: string;
  createdAt: Date;
}

export interface RecordPaymentEventData {
  paymentId: string;
  eventType: PaymentEventType;
  providerEventId?: string | null;
  providerTransactionId?: string | null;
  payload?: Prisma.InputJsonValue;
}

export interface RecordPaymentEventResult {
  duplicate: boolean;
}

export interface UpdatePaymentStatusData {
  paymentId: string;
  status: PaymentStatus;
  completedAt?: Date | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}

export interface PaymentRepositoryPort {
  create(data: CreatePaymentData): Promise<Payment>;
  findById(paymentId: string): Promise<Payment | null>;
  findByProviderTransactionId(providerTransactionId: string): Promise<Payment | null>;
  recordEvent(data: RecordPaymentEventData): Promise<RecordPaymentEventResult>;
  updateStatus(data: UpdatePaymentStatusData): Promise<Payment>;
}
