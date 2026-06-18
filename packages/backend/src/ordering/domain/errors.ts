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

export class TicketTypeInactiveError extends Error {
  constructor(ticketTypeId: string) {
    super(`Ticket type is not active: ${ticketTypeId}`);
    this.name = 'TicketTypeInactiveError';
  }
}

export class TicketTypeSaleWindowError extends Error {
  constructor(ticketTypeId: string) {
    super(`Ticket type is outside the sale window: ${ticketTypeId}`);
    this.name = 'TicketTypeSaleWindowError';
  }
}

export class InsufficientTicketInventoryError extends Error {
  constructor(ticketTypeId: string, requestedQuantity: number) {
    super(`Insufficient inventory for ticket type ${ticketTypeId}: ${requestedQuantity}`);
    this.name = 'InsufficientTicketInventoryError';
  }
}

export class InventoryReservationConflictError extends Error {
  constructor(orderId: string) {
    super(`Inventory reservation conflict for order: ${orderId}`);
    this.name = 'InventoryReservationConflictError';
  }
}
