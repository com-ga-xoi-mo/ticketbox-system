import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaymentSimulatorOutcome } from '../../../domain/payment-simulator-outcome.enum';

export class SimulatorCallbackDto {
  @IsString()
  token!: string;

  @IsEnum(PaymentSimulatorOutcome)
  outcome!: PaymentSimulatorOutcome;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  providerEventId?: string;
}
