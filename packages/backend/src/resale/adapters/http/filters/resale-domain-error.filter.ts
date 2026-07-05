import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ResaleDomainError } from '../../../domain/errors';

@Catch(ResaleDomainError)
export class ResaleDomainErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResaleDomainErrorFilter.name);

  catch(exception: ResaleDomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;

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
      case 'NOT_ORDER_BUYER':
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
      case 'TICKET_NOT_ISSUED':
      case 'EVENT_RESALE_DISABLED':
      case 'RESALE_CUTOFF_PASSED':
      case 'PRICE_EXCEEDS_CAP':
      case 'GUEST_LIST_RESALE_NOT_ALLOWED':
      case 'LISTING_NOT_ACTIVE':
      case 'LISTING_EXPIRED':
      case 'THREAD_CLOSED':
      case 'INVALID_MESSAGE_BODY':
      case 'PAYMENT_PROOF_REQUIRED':
        status = HttpStatus.BAD_REQUEST;
        break;
      default:
        this.logger.warn(`Unmapped ResaleDomainError code: ${exception.code}`);
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        break;
    }

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      message: exception.message,
    });
  }
}
