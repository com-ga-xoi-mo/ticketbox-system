import type { OrderStatus } from './order-status.enum';

export class InvalidOrderTransitionError extends Error {
  constructor(currentStatus: OrderStatus, nextStatus: OrderStatus) {
    super(`Invalid order transition: ${currentStatus} -> ${nextStatus}`);
    this.name = 'InvalidOrderTransitionError';
  }
}

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`);
    this.name = 'OrderNotFoundError';
  }
}

export class OrderAccessDeniedError extends Error {
  constructor(orderId: string, userId: string) {
    super(`User ${userId} is not authorized to access order: ${orderId}`);
    this.name = 'OrderAccessDeniedError';
  }
}

export class OrderConflictError extends Error {
  constructor(orderId: string) {
    super(`Order status update conflict: ${orderId}`);
    this.name = 'OrderConflictError';
  }
}

export class TicketTypeNotFoundError extends Error {
  constructor(concertId: string, ticketTypeId: string) {
    super(`Ticket type ${ticketTypeId} not found for concert: ${concertId}`);
    this.name = 'TicketTypeNotFoundError';
  }
}
