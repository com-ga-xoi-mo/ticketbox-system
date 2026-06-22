import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { InvalidTicketPriceError, TicketTypeCodeAlreadyExistsError } from '../../domain/errors';
import { mapConcertErrors } from './concert-error.mapper';

describe('mapConcertErrors', () => {
  it('maps ticket-type validation domain errors to BadRequestException', async () => {
    await expect(
      mapConcertErrors(async () => {
        throw new InvalidTicketPriceError();
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('maps ticket-type duplicate-code domain errors to ConflictException', async () => {
    await expect(
      mapConcertErrors(async () => {
        throw new TicketTypeCodeAlreadyExistsError('VIP');
      }),
    ).rejects.toThrow(ConflictException);
  });
});
