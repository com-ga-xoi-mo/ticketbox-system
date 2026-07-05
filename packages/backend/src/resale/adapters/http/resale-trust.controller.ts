import { Controller, Get, Param } from '@nestjs/common';
import { GetSellerProfileUseCase } from '../../application/use-cases/trust.use-cases';

@Controller('sellers')
export class ResaleTrustController {
  constructor(private readonly getSellerProfileUseCase: GetSellerProfileUseCase) {}

  @Get(':userId/profile')
  async getProfile(@Param('userId') userId: string) {
    return this.getSellerProfileUseCase.execute(userId);
  }
}
