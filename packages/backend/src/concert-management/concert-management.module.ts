import { Module } from '@nestjs/common';

import { DatabaseModule } from '../platform/database/database.module';
import { AuthModule } from '../identity/auth.module';
import { AuthorizeConcertManagementUseCase } from '../identity/application/use-cases/authorize-concert-management.use-case';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../platform/storage';

// Ports
import {
  PUBLIC_CONCERT_CATALOG,
  type PublicConcertCatalogPort,
} from './domain/ports/public-concert-catalog.port';
import {
  CONCERT_WRITE_REPOSITORY,
  type ConcertWriteRepositoryPort,
} from './domain/ports/concert-write.port';
import {
  SEATING_MAP_WRITE_REPOSITORY,
  type SeatingMapWriteRepositoryPort,
} from './domain/ports/seating-map-write.port';
import {
  SEATING_ZONE_REPOSITORY,
  type SeatingZoneRepositoryPort,
} from './domain/ports/seating-zone.port';
import {
  TICKET_TYPE_ZONE_REPOSITORY,
  type TicketTypeZoneRepositoryPort,
} from './domain/ports/ticket-type-zone.port';

// Repositories
import { PrismaPublicConcertCatalogRepository } from './infrastructure/database/prisma-public-concert-catalog.repository';
import { PrismaConcertWriteRepository } from './infrastructure/database/prisma-concert-write.repository';
import { PrismaSeatingMapWriteRepository } from './infrastructure/database/prisma-seating-map-write.repository';
import { PrismaSeatingZoneRepository } from './infrastructure/database/prisma-seating-zone.repository';
import { PrismaTicketTypeZoneRepository } from './infrastructure/database/prisma-ticket-type-zone.repository';

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
import { UploadSeatingMapUseCase } from './application/use-cases/upload-seating-map.use-case';
import { UpsertSeatingZonesUseCase } from './application/use-cases/upsert-seating-zones.use-case';
import { UpdateTicketTypeZoneMappingsUseCase } from './application/use-cases/update-ticket-type-zone-mappings.use-case';
import { SvgSafetyValidator } from './application/services/svg-safety-validator';

// Controllers
import { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
import { OrganizerConcertController } from './adapters/http/organizer-concert.controller';
import { OrganizerTicketTypeController } from './adapters/http/organizer-ticket-type.controller';
import { AdminConcertController } from './adapters/http/admin-concert.controller';
import { OrganizerSeatingMapController } from './adapters/http/organizer-seating-map.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    PublicConcertCatalogController,
    OrganizerConcertController,
    OrganizerTicketTypeController,
    OrganizerSeatingMapController,
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
      provide: SEATING_MAP_WRITE_REPOSITORY,
      useClass: PrismaSeatingMapWriteRepository,
    },
    {
      provide: SEATING_ZONE_REPOSITORY,
      useClass: PrismaSeatingZoneRepository,
    },
    {
      provide: TICKET_TYPE_ZONE_REPOSITORY,
      useClass: PrismaTicketTypeZoneRepository,
    },
    {
      provide: SvgSafetyValidator,
      useFactory: () => new SvgSafetyValidator(),
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
    {
      provide: UploadSeatingMapUseCase,
      inject: [
        AuthorizeConcertManagementUseCase,
        OBJECT_STORAGE,
        SEATING_MAP_WRITE_REPOSITORY,
        PlatformConfigService,
        SvgSafetyValidator,
      ],
      useFactory: (
        authorize: AuthorizeConcertManagementUseCase,
        storage: ObjectStoragePort,
        seatingMapRepo: SeatingMapWriteRepositoryPort,
        config: PlatformConfigService,
        svgSafetyValidator: SvgSafetyValidator,
      ) =>
        new UploadSeatingMapUseCase(
          authorize,
          storage,
          seatingMapRepo,
          config,
          svgSafetyValidator,
        ),
    },
    {
      provide: UpsertSeatingZonesUseCase,
      inject: [AuthorizeConcertManagementUseCase, SEATING_ZONE_REPOSITORY],
      useFactory: (
        authorize: AuthorizeConcertManagementUseCase,
        seatingZoneRepo: SeatingZoneRepositoryPort,
      ) => new UpsertSeatingZonesUseCase(authorize, seatingZoneRepo),
    },
    {
      provide: UpdateTicketTypeZoneMappingsUseCase,
      inject: [
        AuthorizeConcertManagementUseCase,
        CONCERT_WRITE_REPOSITORY,
        SEATING_ZONE_REPOSITORY,
        TICKET_TYPE_ZONE_REPOSITORY,
      ],
      useFactory: (
        authorize: AuthorizeConcertManagementUseCase,
        concertWriteRepo: ConcertWriteRepositoryPort,
        seatingZoneRepo: SeatingZoneRepositoryPort,
        ticketTypeZoneRepo: TicketTypeZoneRepositoryPort,
      ) =>
        new UpdateTicketTypeZoneMappingsUseCase(
          authorize,
          concertWriteRepo,
          seatingZoneRepo,
          ticketTypeZoneRepo,
        ),
    },
  ],
})
export class ConcertManagementModule {}

export { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
export { OrganizerConcertController } from './adapters/http/organizer-concert.controller';
export { OrganizerTicketTypeController } from './adapters/http/organizer-ticket-type.controller';
export { OrganizerSeatingMapController } from './adapters/http/organizer-seating-map.controller';
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
export { UploadSeatingMapUseCase } from './application/use-cases/upload-seating-map.use-case';
export { UpsertSeatingZonesUseCase } from './application/use-cases/upsert-seating-zones.use-case';
export { UpdateTicketTypeZoneMappingsUseCase } from './application/use-cases/update-ticket-type-zone-mappings.use-case';
