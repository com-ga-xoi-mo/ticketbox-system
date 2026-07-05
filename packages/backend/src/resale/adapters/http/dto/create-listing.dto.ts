import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  ticketId!: string;

  @IsNumber()
  @Min(0)
  askingPriceVnd!: number;
}
