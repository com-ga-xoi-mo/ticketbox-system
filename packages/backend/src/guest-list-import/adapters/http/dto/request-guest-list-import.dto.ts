import { IsString, MaxLength } from 'class-validator';
export class RequestGuestListImportDto {
  @IsString() @MaxLength(240) sourceName!: string;
  @IsString() @MaxLength(160) contentType!: string;
  @IsString() @MaxLength(7_000_000) contentBase64!: string;
}
