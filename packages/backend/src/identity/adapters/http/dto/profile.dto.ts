import { IsOptional, IsString, MaxLength, Matches, IsEnum, IsISO8601 } from 'class-validator';

enum GenderDto {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Phone must be 7 to 15 digits, optionally prefixed with +' })
  phone?: string | null;

  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsEnum(GenderDto)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string | null;
}
