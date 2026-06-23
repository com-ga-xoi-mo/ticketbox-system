import { IsString, MaxLength } from 'class-validator';

export class UploadArtistBioPressKitDto {
  @IsString()
  @MaxLength(240)
  originalName!: string;

  @IsString()
  @MaxLength(160)
  contentType!: string;

  @IsString()
  contentBase64!: string;
}
