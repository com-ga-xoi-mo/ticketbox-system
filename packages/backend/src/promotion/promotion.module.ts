import { Module } from '@nestjs/common';
import { DatabaseModule } from '../platform/database/database.module';
import { PrismaPromotionRepository } from './infrastructure/database/prisma-promotion.repository';
import { ValidatePromotionUseCase } from './application/use-cases/validate-promotion.use-case';
import { PromotionValidationService } from './promotion-validation.service';
import { PromotionUsageRollbackService } from './promotion-usage-rollback.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: 'IPromotionRepository',
      useClass: PrismaPromotionRepository,
    },
    {
      provide: ValidatePromotionUseCase,
      useFactory: (repo) => new ValidatePromotionUseCase(repo),
      inject: ['IPromotionRepository'],
    },
    {
      provide: 'PromotionValidationPort',
      useClass: PromotionValidationService,
    },
    {
      provide: 'PromotionUsageRollbackPort',
      useClass: PromotionUsageRollbackService,
    },
  ],
  exports: ['PromotionValidationPort', 'PromotionUsageRollbackPort', ValidatePromotionUseCase],
})
export class PromotionModule {}
