import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateConcertDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must be URL-safe (lowercase alphanumeric and hyphens, no consecutive/leading/trailing hyphens)',
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  artistName!: string;

  @IsString()
  @IsNotEmpty()
  venueName!: string;

  @IsString()
  @IsOptional()
  venueAddress?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
