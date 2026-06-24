import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength, IsEmail, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Role } from '../../../domain/role.enum';
import { UserStatus } from '../../../domain/user-status.enum';

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
