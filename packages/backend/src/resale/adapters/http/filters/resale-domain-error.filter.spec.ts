import { ResaleDomainErrorFilter } from './resale-domain-error.filter';
import { ListingNotFoundError, InvalidMessageBodyError, ResaleDomainError } from '../../../domain/errors';
import { ArgumentsHost } from '@nestjs/common';
import { describe, it, expect, vi } from 'vitest';

describe('ResaleDomainErrorFilter', () => {
  it('maps LISTING_NOT_FOUND to 404', () => {
    const filter = new ResaleDomainErrorFilter();
    const exception = new ListingNotFoundError('123');

    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const response = { status: statusMock, json: jsonMock };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 404,
      code: 'LISTING_NOT_FOUND',
      message: 'Listing 123 not found.',
    });
  });

  it('maps unmapped codes to 500 INTERNAL_SERVER_ERROR by default', () => {
    const filter = new ResaleDomainErrorFilter();
    const exception = new ResaleDomainError('Unknown error', 'SOME_UNKNOWN_CODE');

    const statusMock = vi.fn().mockReturnThis();
    const jsonMock = vi.fn();
    const response = { status: statusMock, json: jsonMock };
    const host = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'SOME_UNKNOWN_CODE',
      message: 'Unknown error',
    });
  });
});
