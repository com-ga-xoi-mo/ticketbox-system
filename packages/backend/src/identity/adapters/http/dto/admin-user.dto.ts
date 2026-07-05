import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength, IsEmail, IsBoolean, Matches, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../../domain/role.enum';
import { UserStatus } from '../../../domain/user-status.enum';


enum GenderDto {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  passwordRaw!: string;

  @IsString()
  @MaxLength(120)
  displayName!: string;

  @IsArray()
  @IsEnum(Role, { each: true })
  roles!: Role[];

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

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];

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

export class SetUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unassigned?: boolean;
}
