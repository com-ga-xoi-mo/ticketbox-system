import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

import { GetConcertAvailabilityUseCase } from '../../application/use-cases/get-concert-availability.use-case';
import { GetPublicConcertDetailUseCase } from '../../application/use-cases/get-public-concert-detail.use-case';
import { ListPublicConcertsUseCase } from '../../application/use-cases/list-public-concerts.use-case';
import { PublicConcertNotFoundError } from '../../domain/errors';

@Controller('concerts')
export class PublicConcertCatalogController {
  constructor(
    private readonly listPublicConcerts: ListPublicConcertsUseCase,
    private readonly getPublicConcertDetail: GetPublicConcertDetailUseCase,
    private readonly getConcertAvailability: GetConcertAvailabilityUseCase,
  ) {}

  @Get()
  async listConcerts() {
    return this.listPublicConcerts.execute();
  }

  @Get(':slug/availability')
  async getAvailability(@Param('slug') slug: string) {
    try {
      return await this.getConcertAvailability.execute(slug);
    } catch (err) {
      if (err instanceof PublicConcertNotFoundError) {
        throw new NotFoundException('Concert not found');
      }
      throw err;
    }
  }

  @Get(':slug')
  async getConcertDetail(@Param('slug') slug: string) {
    try {
      return await this.getPublicConcertDetail.execute(slug);
    } catch (err) {
      if (err instanceof PublicConcertNotFoundError) {
        throw new NotFoundException('Concert not found');
      }
      throw err;
    }
  }
}
