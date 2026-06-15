import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateConcertDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  artistName?: string;

  @IsString()
  @IsOptional()
  venueName?: string;

  @IsString()
  @IsOptional()
  venueAddress?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
