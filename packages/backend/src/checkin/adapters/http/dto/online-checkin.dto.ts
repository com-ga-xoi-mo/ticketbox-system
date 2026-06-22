import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class OnlineCheckinDto {
  @IsUUID()
  assignmentId!: string;

  @IsUUID()
  concertId!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  gate?: string;

  @IsString()
  @IsNotEmpty()
  qrPayload!: string;

  @IsDateString()
  scannedAt!: string;

  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  deviceId!: string;
}
