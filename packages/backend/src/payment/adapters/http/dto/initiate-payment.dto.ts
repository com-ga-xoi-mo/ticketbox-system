import { IsIn, IsOptional } from 'class-validator';

export class InitiatePaymentDto {
  @IsOptional()
  @IsIn(['SIMULATOR'])
  provider?: 'SIMULATOR';
}
