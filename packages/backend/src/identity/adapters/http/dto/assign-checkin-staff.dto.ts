import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignCheckinStaffDto {
  @IsUUID()
  staffUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  gateName?: string;
}
