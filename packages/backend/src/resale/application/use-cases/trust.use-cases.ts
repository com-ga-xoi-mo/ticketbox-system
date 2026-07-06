import { Injectable, Inject } from '@nestjs/common';
import { IResaleTrustRepository, RESALE_TRUST_REPOSITORY } from '../../domain/ports/resale-trust-repository.port';

@Injectable()
export class GetSellerProfileUseCase {
  constructor(@Inject(RESALE_TRUST_REPOSITORY) private readonly trustRepo: IResaleTrustRepository) {}
  async execute(userId: string) {
    return this.trustRepo.getSellerProfile(userId);
  }
}

@Injectable()
export class ComputeTrustScoreUseCase {
  constructor(@Inject(RESALE_TRUST_REPOSITORY) private readonly trustRepo: IResaleTrustRepository) {}
  async execute(sellerId: string, event?: string) {
    return this.trustRepo.computeTrustScore(sellerId, event);
  }
}
