import { Module } from '@nestjs/common';

import { DatabaseModule } from '../platform/database/database.module';
import { AuthModule } from '../identity/auth.module';
import { AuthorizeConcertManagementUseCase } from '../identity/application/use-cases/authorize-concert-management.use-case';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../platform/storage';
import { CACHE_SERVICE, type CacheServicePort } from '../platform/cache/cache.tokens';

// Cache decorators — read
import { CachingListPublicConcertsUseCase } from './application/cache/caching-list-public-concerts.use-case';
import { CachingGetPublicConcertDetailUseCase } from './application/cache/caching-get-public-concert-detail.use-case';
import { CachingGetConcertAvailabilityUseCase } from './application/cache/caching-get-concert-availability.use-case';

// Cache decorators — concert writes (invalidating)
import {
  InvalidatingCreateConcertUseCase,
  InvalidatingUpdateConcertUseCase,
  InvalidatingPublishConcertUseCase,
  InvalidatingCancelConcertUseCase,
} from './application/cache/invalidating-concert-write.use-cases';

// Cache decorators — ticket-type writes (invalidating)
import {
  InvalidatingCreateTicketTypeUseCase,
  InvalidatingUpdateTicketTypeUseCase,
  InvalidatingArchiveTicketTypeUseCase,
} from './application/cache/invalidating-ticket-type-write.use-cases';

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
  POSTER_WRITE_REPOSITORY,
  type PosterWriteRepositoryPort,
} from './domain/ports/poster-write.port';
import {
  SEATING_ZONE_REPOSITORY,
  type SeatingZoneRepositoryPort,
} from './domain/ports/seating-zone.port';
import {
  TICKET_TYPE_ZONE_REPOSITORY,
  type TicketTypeZoneRepositoryPort,
} from './domain/ports/ticket-type-zone.port';
import {
  ASSET_READ_REPOSITORY,
  type AssetReadRepositoryPort,
} from './domain/ports/asset-read.port';

// Repositories
import { PrismaPublicConcertCatalogRepository } from './infrastructure/database/prisma-public-concert-catalog.repository';
import { PrismaConcertWriteRepository } from './infrastructure/database/prisma-concert-write.repository';
import { PrismaSeatingMapWriteRepository } from './infrastructure/database/prisma-seating-map-write.repository';
import { PrismaPosterWriteRepository } from './infrastructure/database/prisma-poster-write.repository';
import { PrismaSeatingZoneRepository } from './infrastructure/database/prisma-seating-zone.repository';
import { PrismaTicketTypeZoneRepository } from './infrastructure/database/prisma-ticket-type-zone.repository';
import { PrismaAssetReadRepository } from './infrastructure/database/prisma-asset-read.repository';

// Use Cases
import { GetConcertAvailabilityUseCase } from './application/use-cases/get-concert-availability.use-case';
import { GetPublicConcertDetailUseCase } from './application/use-cases/get-public-concert-detail.use-case';
import { ListPublicConcertsUseCase } from './application/use-cases/list-public-concerts.use-case';
import { ListConcertCitiesUseCase } from './application/use-cases/list-concert-cities.use-case';
import { CreateConcertUseCase } from './application/use-cases/create-concert.use-case';
import { UpdateConcertUseCase } from './application/use-cases/update-concert.use-case';
import { PublishConcertUseCase } from './application/use-cases/publish-concert.use-case';
import { CancelConcertUseCase } from './application/use-cases/cancel-concert.use-case';
import { CreateTicketTypeUseCase } from './application/use-cases/create-ticket-type.use-case';
import { UpdateTicketTypeUseCase } from './application/use-cases/update-ticket-type.use-case';
import { ArchiveTicketTypeUseCase } from './application/use-cases/archive-ticket-type.use-case';
import { UploadPosterUseCase } from './application/use-cases/upload-poster.use-case';
import { UploadSeatingMapUseCase } from './application/use-cases/upload-seating-map.use-case';
import { UpsertSeatingZonesUseCase } from './application/use-cases/upsert-seating-zones.use-case';
import { UpdateTicketTypeZoneMappingsUseCase } from './application/use-cases/update-ticket-type-zone-mappings.use-case';
import { ListOrganizerConcertsUseCase } from './application/use-cases/list-organizer-concerts.use-case';
import { GetOrganizerConcertUseCase } from './application/use-cases/get-organizer-concert.use-case';
import { ListAdminConcertsUseCase } from './application/use-cases/list-admin-concerts.use-case';
import { GetAdminConcertUseCase } from './application/use-cases/get-admin-concert.use-case';
import { SvgSafetyValidator } from './application/services/svg-safety-validator';
import { PosterImageValidator } from './application/services/poster-image-validator';
import { GetAssetContentUseCase } from './application/use-cases/get-asset-content.use-case';

// Controllers
import { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
import { OrganizerConcertController } from './adapters/http/organizer-concert.controller';
import { OrganizerTicketTypeController } from './adapters/http/organizer-ticket-type.controller';
import { OrganizerPosterController } from './adapters/http/organizer-poster.controller';
import { AdminConcertController } from './adapters/http/admin-concert.controller';
import { OrganizerSeatingMapController } from './adapters/http/organizer-seating-map.controller';
import { AssetController } from './adapters/http/asset.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    PublicConcertCatalogController,
    OrganizerConcertController,
    OrganizerTicketTypeController,
    OrganizerPosterController,
    OrganizerSeatingMapController,
    AdminConcertController,
    AssetController,
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
      provide: POSTER_WRITE_REPOSITORY,
      useClass: PrismaPosterWriteRepository,
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
      provide: ASSET_READ_REPOSITORY,
      useClass: PrismaAssetReadRepository,
    },
    {
      provide: SvgSafetyValidator,
      useFactory: () => new SvgSafetyValidator(),
    },
    {
      provide: PosterImageValidator,
      useFactory: () => new PosterImageValidator(),
    },
    {
      provide: GetAssetContentUseCase,
      inject: [ASSET_READ_REPOSITORY, OBJECT_STORAGE],
      useFactory: (assetReadRepo: AssetReadRepositoryPort, storage: ObjectStoragePort) =>
        new GetAssetContentUseCase(assetReadRepo, storage),
    },
    {
      provide: ListPublicConcertsUseCase,
      inject: [PUBLIC_CONCERT_CATALOG, CACHE_SERVICE],
      useFactory: (catalog: PublicConcertCatalogPort, cache: CacheServicePort) =>
        new CachingListPublicConcertsUseCase(new ListPublicConcertsUseCase(catalog), cache),
    },
    {
      provide: ListConcertCitiesUseCase,
      inject: [PUBLIC_CONCERT_CATALOG],
      useFactory: (catalog: PublicConcertCatalogPort) => new ListConcertCitiesUseCase(catalog),
    },
    {
      provide: GetPublicConcertDetailUseCase,
      inject: [PUBLIC_CONCERT_CATALOG, CACHE_SERVICE],
      useFactory: (catalog: PublicConcertCatalogPort, cache: CacheServicePort) =>
        new CachingGetPublicConcertDetailUseCase(
          new GetPublicConcertDetailUseCase(catalog),
          cache,
          new CachingGetConcertAvailabilityUseCase(
            new GetConcertAvailabilityUseCase(catalog),
            cache,
          ),
        ),
    },
    {
      provide: GetConcertAvailabilityUseCase,
      inject: [PUBLIC_CONCERT_CATALOG, CACHE_SERVICE],
      useFactory: (catalog: PublicConcertCatalogPort, cache: CacheServicePort) =>
        new CachingGetConcertAvailabilityUseCase(new GetConcertAvailabilityUseCase(catalog), cache),
    },
    {
      provide: CreateConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, CACHE_SERVICE],
      useFactory: (repo: ConcertWriteRepositoryPort, cache: CacheServicePort) =>
        new InvalidatingCreateConcertUseCase(new CreateConcertUseCase(repo), cache),
    },
    {
      provide: UpdateConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase, CACHE_SERVICE],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
        cache: CacheServicePort,
      ) => new InvalidatingUpdateConcertUseCase(new UpdateConcertUseCase(repo, authUseCase), cache),
    },
    {
      provide: PublishConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase, CACHE_SERVICE],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
        cache: CacheServicePort,
      ) =>
        new InvalidatingPublishConcertUseCase(new PublishConcertUseCase(repo, authUseCase), cache),
    },
    {
      provide: CancelConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase, CACHE_SERVICE],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
        cache: CacheServicePort,
      ) => new InvalidatingCancelConcertUseCase(new CancelConcertUseCase(repo, authUseCase), cache),
    },
    {
      provide: CreateTicketTypeUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase, CACHE_SERVICE],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
        cache: CacheServicePort,
      ) =>
        new InvalidatingCreateTicketTypeUseCase(
          new CreateTicketTypeUseCase(repo, authUseCase),
          cache,
        ),
    },
    {
      provide: UpdateTicketTypeUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase, CACHE_SERVICE],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
        cache: CacheServicePort,
      ) =>
        new InvalidatingUpdateTicketTypeUseCase(
          new UpdateTicketTypeUseCase(repo, authUseCase),
          cache,
        ),
    },
    {
      provide: ArchiveTicketTypeUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase, CACHE_SERVICE],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
        cache: CacheServicePort,
      ) =>
        new InvalidatingArchiveTicketTypeUseCase(
          new ArchiveTicketTypeUseCase(repo, authUseCase),
          cache,
        ),
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
        new UploadSeatingMapUseCase(authorize, storage, seatingMapRepo, config, svgSafetyValidator),
    },
    {
      provide: UploadPosterUseCase,
      inject: [
        AuthorizeConcertManagementUseCase,
        OBJECT_STORAGE,
        POSTER_WRITE_REPOSITORY,
        PlatformConfigService,
        PosterImageValidator,
      ],
      useFactory: (
        authorize: AuthorizeConcertManagementUseCase,
        storage: ObjectStoragePort,
        posterRepo: PosterWriteRepositoryPort,
        config: PlatformConfigService,
        posterImageValidator: PosterImageValidator,
      ) => new UploadPosterUseCase(authorize, storage, posterRepo, config, posterImageValidator),
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
    {
      provide: ListOrganizerConcertsUseCase,
      inject: [CONCERT_WRITE_REPOSITORY],
      useFactory: (repo: ConcertWriteRepositoryPort) => new ListOrganizerConcertsUseCase(repo),
    },
    {
      provide: GetOrganizerConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new GetOrganizerConcertUseCase(repo, authUseCase),
    },
    {
      provide: ListAdminConcertsUseCase,
      inject: [CONCERT_WRITE_REPOSITORY],
      useFactory: (repo: ConcertWriteRepositoryPort) => new ListAdminConcertsUseCase(repo),
    },
    {
      provide: GetAdminConcertUseCase,
      inject: [CONCERT_WRITE_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repo: ConcertWriteRepositoryPort,
        authUseCase: AuthorizeConcertManagementUseCase,
      ) => new GetAdminConcertUseCase(repo, authUseCase),
    },
  ],
})
export class ConcertManagementModule {}

export { PublicConcertCatalogController } from './adapters/http/public-concert-catalog.controller';
export { OrganizerConcertController } from './adapters/http/organizer-concert.controller';
export { OrganizerTicketTypeController } from './adapters/http/organizer-ticket-type.controller';
export { OrganizerPosterController } from './adapters/http/organizer-poster.controller';
export { OrganizerSeatingMapController } from './adapters/http/organizer-seating-map.controller';
export { AdminConcertController } from './adapters/http/admin-concert.controller';
export { AssetController } from './adapters/http/asset.controller';
export { GetConcertAvailabilityUseCase } from './application/use-cases/get-concert-availability.use-case';
export { GetPublicConcertDetailUseCase } from './application/use-cases/get-public-concert-detail.use-case';
export { ListPublicConcertsUseCase } from './application/use-cases/list-public-concerts.use-case';
export { ListConcertCitiesUseCase } from './application/use-cases/list-concert-cities.use-case';
export { CreateConcertUseCase } from './application/use-cases/create-concert.use-case';
export { UpdateConcertUseCase } from './application/use-cases/update-concert.use-case';
export { PublishConcertUseCase } from './application/use-cases/publish-concert.use-case';
export { CancelConcertUseCase } from './application/use-cases/cancel-concert.use-case';
export { CreateTicketTypeUseCase } from './application/use-cases/create-ticket-type.use-case';
export { UpdateTicketTypeUseCase } from './application/use-cases/update-ticket-type.use-case';
export { ArchiveTicketTypeUseCase } from './application/use-cases/archive-ticket-type.use-case';
export { UploadPosterUseCase } from './application/use-cases/upload-poster.use-case';
export { UploadSeatingMapUseCase } from './application/use-cases/upload-seating-map.use-case';
export { UpsertSeatingZonesUseCase } from './application/use-cases/upsert-seating-zones.use-case';
export { UpdateTicketTypeZoneMappingsUseCase } from './application/use-cases/update-ticket-type-zone-mappings.use-case';
export { ListOrganizerConcertsUseCase } from './application/use-cases/list-organizer-concerts.use-case';
export { GetOrganizerConcertUseCase } from './application/use-cases/get-organizer-concert.use-case';
export { ListAdminConcertsUseCase } from './application/use-cases/list-admin-concerts.use-case';
export { GetAdminConcertUseCase } from './application/use-cases/get-admin-concert.use-case';
export { GetAssetContentUseCase } from './application/use-cases/get-asset-content.use-case';
