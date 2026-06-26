import { IsString, MinLength } from 'class-validator';

export class UpdateMyPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
