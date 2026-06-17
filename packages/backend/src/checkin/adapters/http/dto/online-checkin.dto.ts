import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class OnlineCheckinDto {
  @IsUUID()
  assignmentId!: string;

  @IsUUID()
  concertId!: string;

  @IsString()
  @IsOptional()
  gate?: string;

  @IsString()
  @IsNotEmpty()
  qrPayload!: string;

  @IsDateString()
  scannedAt!: string;

  @IsString()
  @IsOptional()
  deviceId?: string;
}
