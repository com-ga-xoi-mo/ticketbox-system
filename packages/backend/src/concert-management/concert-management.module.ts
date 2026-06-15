import { Module } from '@nestjs/common';

import { DatabaseModule } from '../platform/database/database.module';
import { AuthModule } from '../identity/auth.module';
import { AuthorizeConcertManagementUseCase } from '../identity/application/use-cases/authorize-concert-management.use-case';

// Ports
import {
  PUBLIC_CONCERT_CATALOG,
  type PublicConcertCatalogPort,
} from './domain/ports/public-concert-catalog.port';
import {
  CONCERT_WRITE_REPOSITORY,
  type ConcertWriteRepositoryPort,
} from './domain/ports/concert-write.port';

// Repositories
import { PrismaPublicConcertCatalogRepository } from './infrastructure/database/prisma-public-concert-catalog.repository';
import { PrismaConcertWriteRepository } from './infrastructure/database/prisma-concert-write.repository';

// Use Cases
import { GetConcertAvailabilityUseCase } from './application/use-cases/get-concert-availability.use-case';
import { GetPublicConcertDetailUseCase } from './application/use-cases/get-public-concert-detail.use-case';
import { ListPublicConcertsUseCase } from './application/use-cases/list-public-concerts.use-case';
import { CreateConcertUseCase } from './application/use-cases/create-concert.use-case';
import { UpdateConcertUseCase } from './application/use-cases/update-concert.use-case';
import { PublishConcertUseCase } from './application/use-cases/publish-concert.use-case';
import { CancelConcertUseCase } from './application/use-cases/cancel-concert.use-case';
import { CreateTicketTypeUseCase } from './application/use-cases/create-ticket-type.use-case';
import { UpdateTicketTypeUseCase } from './application/use-cases/update-ticket-type.use-case';
import { ArchiveTicketTypeUseCase } from './application/use-cases/archive-ticket-type.use-case';

// Controllers
import { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
import { OrganizerConcertController } from './adapters/http/organizer-concert.controller';
import { OrganizerTicketTypeController } from './adapters/http/organizer-ticket-type.controller';
import { AdminConcertController } from './adapters/http/admin-concert.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    PublicConcertCatalogController,
    OrganizerConcertController,
    OrganizerTicketTypeController,
    AdminConcertController,
  ],
  providers: [
    {
      provide: PUBLIC_CONCERT_CATALOG,
      useClass: PrismaPublicConcertCatalogRepository,
    },
    {
      provide: CONCERT_WRITE_REPOSITORY,
      useClass: PrismaConcertWriteRepository,
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
    {
      provide: CreateConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY],
      useFactory: (repo: ConcertWriteRepositoryPort) => new CreateConcertUseCase(repo),
    },
    {
      provide: UpdateConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new UpdateConcertUseCase(repo, authUseCase),
    },
    {
      provide: PublishConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new PublishConcertUseCase(repo, authUseCase),
    },
    {
      provide: CancelConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new CancelConcertUseCase(repo, authUseCase),
    },
    {
      provide: CreateTicketTypeUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new CreateTicketTypeUseCase(repo, authUseCase),
    },
    {
      provide: UpdateTicketTypeUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new UpdateTicketTypeUseCase(repo, authUseCase),
    },
    {
      provide: ArchiveTicketTypeUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new ArchiveTicketTypeUseCase(repo, authUseCase),
    },
  ],
})
export class ConcertManagementModule {}

export { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
export { OrganizerConcertController } from './adapters/http/organizer-concert.controller';
export { OrganizerTicketTypeController } from './adapters/http/organizer-ticket-type.controller';
export { AdminConcertController } from './adapters/http/admin-concert.controller';
export { GetConcertAvailabilityUseCase } from './application/use-cases/get-concert-availability.use-case';
export { GetPublicConcertDetailUseCase } from './application/use-cases/get-public-concert-detail.use-case';
export { ListPublicConcertsUseCase } from './application/use-cases/list-public-concerts.use-case';
export { CreateConcertUseCase } from './application/use-cases/create-concert.use-case';
export { UpdateConcertUseCase } from './application/use-cases/update-concert.use-case';
export { PublishConcertUseCase } from './application/use-cases/publish-concert.use-case';
export { CancelConcertUseCase } from './application/use-cases/cancel-concert.use-case';
export { CreateTicketTypeUseCase } from './application/use-cases/create-ticket-type.use-case';
export { UpdateTicketTypeUseCase } from './application/use-cases/update-ticket-type.use-case';
export { ArchiveTicketTypeUseCase } from './application/use-cases/archive-ticket-type.use-case';
