import { Module } from '@nestjs/common';

import { DatabaseModule } from '../platform/database/database.module';
import { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
import { GetConcertAvailabilityUseCase } from './application/use-cases/get-concert-availability.use-case';
import { GetPublicConcertDetailUseCase } from './application/use-cases/get-public-concert-detail.use-case';
import { ListPublicConcertsUseCase } from './application/use-cases/list-public-concerts.use-case';
import {
  PUBLIC_CONCERT_CATALOG,
  type PublicConcertCatalogPort,
} from './domain/ports/public-concert-catalog.port';
import { PrismaPublicConcertCatalogRepository } from './infrastructure/database/prisma-public-concert-catalog.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicConcertCatalogController],
  providers: [
    {
      provide: PUBLIC_CONCERT_CATALOG,
      useClass: PrismaPublicConcertCatalogRepository,
    },
    {
      provide: ListPublicConcertsUseCase,
      inject: [PUBLIC_CONCERT_CATALOG],
      useFactory: (catalog: PublicConcertCatalogPort) => new ListPublicConcertsUseCase(catalog),
    },
    {
      provide: GetPublicConcertDetailUseCase,
      inject: [PUBLIC_CONCERT_CATALOG],
      useFactory: (catalog: PublicConcertCatalogPort) => new GetPublicConcertDetailUseCase(catalog),
    },
    {
      provide: GetConcertAvailabilityUseCase,
      inject: [PUBLIC_CONCERT_CATALOG],
      useFactory: (catalog: PublicConcertCatalogPort) => new GetConcertAvailabilityUseCase(catalog),
    },
  ],
})
export class ConcertManagementModule {}

export { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
export { GetConcertAvailabilityUseCase } from './application/use-cases/get-concert-availability.use-case';
export { GetPublicConcertDetailUseCase } from './application/use-cases/get-public-concert-detail.use-case';
export { ListPublicConcertsUseCase } from './application/use-cases/list-public-concerts.use-case';
