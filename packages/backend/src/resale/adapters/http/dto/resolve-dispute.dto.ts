import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ResolveDisputeDto {
  @IsIn(['complete', 'cancel'])
  action!: 'complete' | 'cancel';

  @IsString()
  @IsNotEmpty()
  resolutionNote!: string;
}
