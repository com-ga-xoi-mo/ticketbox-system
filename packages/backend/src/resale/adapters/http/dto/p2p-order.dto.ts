import { IsNotEmpty, IsString } from 'class-validator';

export class InitiateOrderDto {
  @IsString()
  @IsNotEmpty()
  listingId!: string;
}

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentProofUrl!: string;
}

export class RaiseDisputeDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
