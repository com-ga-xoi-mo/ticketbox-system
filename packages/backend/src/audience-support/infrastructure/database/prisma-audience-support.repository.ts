import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import { OrderStatus } from '../../../ordering/domain/order-status.enum';
import { TicketStatus } from '../../../ordering/domain/ticket-status.enum';
import type {
  AudienceSupportRepositoryPort,
  CreateRefundRequestInput,
  CreateSupportRequestInput,
} from '../../domain/ports/audience-support-repository.port';
import {
  RefundRequestReason,
  RefundRequestStatus,
  SupportRequestCategory,
  SupportRequestStatus,
  type OwnedOrderResource,
  type OwnedTicketResource,
  type RefundRequestRecord,
  type SupportRequestRecord,
} from '../../domain/support.types';

const ACTIVE_REFUND_STATUSES = [
  RefundRequestStatus.REQUESTED,
  RefundRequestStatus.UNDER_REVIEW,
  RefundRequestStatus.APPROVED,
];

@Injectable()
export class PrismaAudienceSupportRepository implements AudienceSupportRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findOwnedOrder(userId: string, orderId: string): Promise<OwnedOrderResource | null> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        concert: { select: { id: true, title: true, venueName: true, startsAt: true } },
        items: { include: { ticketType: { select: { name: true } } } },
        tickets: { select: { id: true, status: true } },
        payments: {
          orderBy: [{ completedAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { provider: true, completedAt: true },
        },
      },
    });

    if (!order) return null;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      concertId: order.concertId,
      status: order.status as OrderStatus,
      totalAmountVnd: order.totalAmountVnd,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        ticketTypeName: item.ticketType.name,
        quantity: item.quantity,
        unitPriceVnd: item.unitPriceVnd,
        totalPriceVnd: item.totalPriceVnd,
      })),
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        status: ticket.status as TicketStatus,
      })),
      concert: order.concert,
      payment: order.payments[0] ?? null,
    };
  }

  async findOwnedTicket(userId: string, ticketId: string): Promise<OwnedTicketResource | null> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, userId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmountVnd: true,
            paidAt: true,
            createdAt: true,
          },
        },
        concert: { select: { id: true, title: true, venueName: true, startsAt: true } },
        ticketType: { select: { name: true, code: true } },
      },
    });

    if (!ticket) return null;
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      orderId: ticket.orderId,
      orderNumber: ticket.order.orderNumber,
      userId: ticket.userId,
      concertId: ticket.concertId,
      status: ticket.status as TicketStatus,
      issuedAt: ticket.issuedAt,
      checkedInAt: ticket.checkedInAt,
      ticketTypeId: ticket.ticketTypeId,
      ticketTypeName: ticket.ticketType.name,
      ticketTypeCode: ticket.ticketType.code,
      qrTokenHash: ticket.qrTokenHash,
      order: {
        ...ticket.order,
        status: ticket.order.status as OrderStatus,
      },
      concert: ticket.concert,
    };
  }

  async createSupportRequest(input: CreateSupportRequestInput): Promise<SupportRequestRecord> {
    const request = await this.prisma.supportRequest.create({
      data: {
        userId: input.userId,
        orderId: input.orderId ?? null,
        ticketId: input.ticketId ?? null,
        category: input.category,
        status: SupportRequestStatus.OPEN,
        subject: input.subject,
        message: input.message,
        statusHistory: {
          create: {
            status: SupportRequestStatus.OPEN,
            note: 'Support request created',
          },
        },
      },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toSupportRequest(request);
  }

  async listSupportRequests(userId: string): Promise<SupportRequestRecord[]> {
    const requests = await this.prisma.supportRequest.findMany({
      where: { userId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return requests.map((request) => this.toSupportRequest(request));
  }

  async findSupportRequest(
    userId: string,
    requestId: string,
  ): Promise<SupportRequestRecord | null> {
    const request = await this.prisma.supportRequest.findFirst({
      where: { id: requestId, userId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return request ? this.toSupportRequest(request) : null;
  }

  async createRefundRequest(input: CreateRefundRequestInput): Promise<RefundRequestRecord> {
    const request = await this.prisma.refundRequest.create({
      data: {
        userId: input.userId,
        orderId: input.orderId,
        ticketId: input.ticketId ?? null,
        status: RefundRequestStatus.REQUESTED,
        reason: input.reason,
        message: input.message ?? null,
        requestedAmountVnd: input.requestedAmountVnd ?? null,
        requestedTicketCount: input.requestedTicketCount ?? null,
        statusHistory: {
          create: {
            status: RefundRequestStatus.REQUESTED,
            note: 'Refund request created',
          },
        },
      },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return this.toRefundRequest(request);
  }

  async listRefundRequests(userId: string): Promise<RefundRequestRecord[]> {
    const requests = await this.prisma.refundRequest.findMany({
      where: { userId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    return requests.map((request) => this.toRefundRequest(request));
  }

  async findRefundRequest(
    userId: string,
    requestId: string,
  ): Promise<RefundRequestRecord | null> {
    const request = await this.prisma.refundRequest.findFirst({
      where: { id: requestId, userId },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    return request ? this.toRefundRequest(request) : null;
  }

  async findActiveRefundRequest(input: {
    userId: string;
    orderId?: string | null;
    ticketId?: string | null;
  }): Promise<RefundRequestRecord | null> {
    const request = await this.prisma.refundRequest.findFirst({
      where: {
        userId: input.userId,
        status: { in: ACTIVE_REFUND_STATUSES },
        ...(input.ticketId ? { ticketId: input.ticketId } : { orderId: input.orderId ?? undefined }),
      },
      include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return request ? this.toRefundRequest(request) : null;
  }

  private toSupportRequest(request: {
    id: string;
    userId: string;
    orderId: string | null;
    ticketId: string | null;
    category: string;
    status: string;
    subject: string;
    message: string;
    createdAt: Date;
    updatedAt: Date;
    statusHistory: Array<{
      id: string;
      status: string;
      note: string | null;
      createdAt: Date;
    }>;
  }): SupportRequestRecord {
    return {
      id: request.id,
      userId: request.userId,
      orderId: request.orderId,
      ticketId: request.ticketId,
      category: request.category as SupportRequestCategory,
      status: request.status as SupportRequestStatus,
      subject: request.subject,
      message: request.message,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      statusHistory: request.statusHistory.map((item) => ({
        id: item.id,
        status: item.status as SupportRequestStatus,
        note: item.note,
        createdAt: item.createdAt,
      })),
    };
  }

  private toRefundRequest(request: {
    id: string;
    userId: string;
    orderId: string;
    ticketId: string | null;
    status: string;
    reason: string;
    message: string | null;
    requestedAmountVnd: number | null;
    requestedTicketCount: number | null;
    createdAt: Date;
    updatedAt: Date;
    statusHistory: Array<{
      id: string;
      status: string;
      note: string | null;
      createdAt: Date;
    }>;
  }): RefundRequestRecord {
    return {
      id: request.id,
      userId: request.userId,
      orderId: request.orderId,
      ticketId: request.ticketId,
      status: request.status as RefundRequestStatus,
      reason: request.reason as RefundRequestReason,
      message: request.message,
      requestedAmountVnd: request.requestedAmountVnd,
      requestedTicketCount: request.requestedTicketCount,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      statusHistory: request.statusHistory.map((item) => ({
        id: item.id,
        status: item.status as RefundRequestStatus,
        note: item.note,
        createdAt: item.createdAt,
      })),
    };
  }
}
