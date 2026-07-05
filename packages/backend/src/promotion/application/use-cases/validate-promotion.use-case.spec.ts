import { describe, it, expect, vi } from 'vitest';
import { ValidatePromotionUseCase } from './validate-promotion.use-case';
import { PromoNotApplicableError } from '../../domain/errors';

describe('ValidatePromotionUseCase', () => {
  it('rejects if orderSourceType is RESALE', async () => {
    const repo = { findByCode: vi.fn(), countUsages: vi.fn(), countUserUsages: vi.fn() };
    const useCase = new ValidatePromotionUseCase(repo as any);

    await expect(useCase.execute({
      code: 'PROMO',
      userId: 'u1',
      concertId: 'c1',
      ticketTypeIds: ['t1'],
      orderSourceType: 'RESALE'
    })).rejects.toThrow(PromoNotApplicableError);
  });
});
