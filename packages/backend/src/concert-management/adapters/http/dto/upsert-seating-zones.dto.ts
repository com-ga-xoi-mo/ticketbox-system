import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export enum SeatingZoneStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpsertSeatingZoneDto {
  @IsString()
  @IsNotEmpty()
  svgElementId!: string;

  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/)
  color?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @IsEnum(SeatingZoneStatusDto)
  @IsOptional()
  status?: SeatingZoneStatusDto;
}

export class UpsertSeatingZonesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertSeatingZoneDto)
  zones!: UpsertSeatingZoneDto[];
}
