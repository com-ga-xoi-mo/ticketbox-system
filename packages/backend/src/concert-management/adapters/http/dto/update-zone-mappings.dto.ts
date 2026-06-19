import { IsArray, IsUUID } from 'class-validator';

export class UpdateZoneMappingsDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  seatingZoneIds!: string[];
}
