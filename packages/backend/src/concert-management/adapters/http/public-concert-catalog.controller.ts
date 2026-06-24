import { BadRequestException, Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { CatalogSearchParamsSchema } from '@ticketbox/api-types';

import { GetConcertAvailabilityUseCase } from '../../application/use-cases/get-concert-availability.use-case';
import { GetPublicConcertDetailUseCase } from '../../application/use-cases/get-public-concert-detail.use-case';
import { ListConcertCitiesUseCase } from '../../application/use-cases/list-concert-cities.use-case';
import { ListPublicConcertsUseCase } from '../../application/use-cases/list-public-concerts.use-case';
import type { CatalogSearchFilters } from '../../domain/catalog.types';
import { PublicConcertNotFoundError } from '../../domain/errors';

@Controller('concerts')
export class PublicConcertCatalogController {
  constructor(
    private readonly listPublicConcerts: ListPublicConcertsUseCase,
    private readonly getPublicConcertDetail: GetPublicConcertDetailUseCase,
    private readonly getConcertAvailability: GetConcertAvailabilityUseCase,
    private readonly listConcertCities: ListConcertCitiesUseCase,
  ) {}

  @Get()
  async listConcerts(@Query() query: unknown) {
    try {
      const parsedQuery = CatalogSearchParamsSchema.parse(query);
      const filters: CatalogSearchFilters = {
        q: parsedQuery.q,
        city: parsedQuery.city,
        dateFrom: parsedQuery.dateFrom ? new Date(parsedQuery.dateFrom) : undefined,
        dateTo: parsedQuery.dateTo ? new Date(parsedQuery.dateTo) : undefined,
        minPrice: parsedQuery.minPrice,
        maxPrice: parsedQuery.maxPrice,
        sortBy: parsedQuery.sortBy,
        sortDir: parsedQuery.sortDir,
      };
      return await this.listPublicConcerts.execute(undefined, filters);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        throw new BadRequestException('Invalid query parameters', { cause: err });
      }
      throw err;
    }
  }

  @Get('cities')
  async listCities() {
    return this.listConcertCities.execute();
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
