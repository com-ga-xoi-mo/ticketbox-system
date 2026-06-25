import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { MAX_BULK_CHECKIN_STAFF_ACCOUNTS } from '../../../application/use-cases/bulk-create-checkin-staff.use-case';

export class BulkCreateCheckinStaffDto {
  @IsEmail()
  baseEmail!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_BULK_CHECKIN_STAFF_ACCOUNTS)
  quantity!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayNamePrefix!: string;
}
