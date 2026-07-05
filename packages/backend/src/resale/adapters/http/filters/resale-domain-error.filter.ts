import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ResaleDomainError } from '../../../domain/errors';

@Catch(ResaleDomainError)
export class ResaleDomainErrorFilter implements ExceptionFilter {
  catch(exception: ResaleDomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.BAD_REQUEST;

    switch (exception.code) {
      case 'LISTING_NOT_FOUND':
      case 'COMMENT_NOT_FOUND':
      case 'THREAD_NOT_FOUND':
      case 'ORDER_NOT_FOUND':
        status = HttpStatus.NOT_FOUND;
        break;
      case 'NOT_TICKET_OWNER':
      case 'NOT_PARTICIPANT':
      case 'NOT_ORDER_PARTICIPANT':
      case 'NOT_ORDER_SELLER':
      case 'BUYER_SUSPENDED':
      case 'SELF_PURCHASE_NOT_ALLOWED':
      case 'SELLER_CANNOT_INITIATE_THREAD':
        status = HttpStatus.FORBIDDEN;
        break;
      case 'CANNOT_CANCEL_AFTER_PAYMENT_CONFIRMED':
      case 'CANNOT_CANCEL_IN_CURRENT_STATE':
      case 'INVALID_ORDER_STATE':
      case 'LISTING_NOT_AVAILABLE':
        status = HttpStatus.CONFLICT;
        break;
      case 'SELLER_BANK_INFO_MISSING':
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        break;
      default:
        // Defaults to BAD_REQUEST for rules like PRICE_EXCEEDS_CAP, LISTING_EXPIRED, etc.
        status = HttpStatus.BAD_REQUEST;
        break;
    }

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
    });
  }
}
