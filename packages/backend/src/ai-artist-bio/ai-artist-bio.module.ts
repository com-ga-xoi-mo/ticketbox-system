import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { AuthorizeConcertManagementUseCase } from '../identity/application/use-cases/authorize-concert-management.use-case';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { DatabaseModule } from '../platform/database/database.module';
import { QueueModule } from '../platform/queue/queue.module';
import { OBJECT_STORAGE, type ObjectStoragePort } from '../platform/storage';
import { GetArtistBioJobUseCase } from './application/use-cases/get-artist-bio-job.use-case';
import { ProcessArtistBioUseCase } from './application/use-cases/process-artist-bio.use-case';
import { PublishArtistBioUseCase } from './application/use-cases/publish-artist-bio.use-case';
import { RejectArtistBioUseCase } from './application/use-cases/reject-artist-bio.use-case';
import { RequestArtistBioUseCase } from './application/use-cases/request-artist-bio.use-case';
import { RetryArtistBioJobUseCase } from './application/use-cases/retry-artist-bio-job.use-case';
import { AdminArtistBioController } from './adapters/http/admin-artist-bio.controller';
import { OrganizerArtistBioController } from './adapters/http/organizer-artist-bio.controller';
import { AI_BIO_GENERATOR, type AiBioGeneratorPort } from './domain/ports/ai-bio-generator.port';
import { ARTIST_BIO_QUEUE, type ArtistBioQueuePort } from './domain/ports/artist-bio-queue.port';
import {
  ARTIST_BIO_REPOSITORY,
  type ArtistBioRepositoryPort,
} from './domain/ports/artist-bio-repository.port';
import {
  PDF_TEXT_EXTRACTOR,
  type PdfTextExtractorPort,
} from './domain/ports/pdf-text-extractor.port';
import { createArtistBioGenerator } from './infrastructure/ai/artist-bio-generator.provider';
import { PrismaArtistBioRepository } from './infrastructure/database/prisma-artist-bio.repository';
import { SimplePdfTextExtractor } from './infrastructure/pdf/simple-pdf-text-extractor';
import { ArtistBioProducer } from './infrastructure/queue/artist-bio.producer';

@Module({
  imports: [AuthModule, DatabaseModule, PlatformConfigModule, QueueModule],
  controllers: [OrganizerArtistBioController, AdminArtistBioController],
  providers: [
    {
      provide: ARTIST_BIO_REPOSITORY,
      useClass: PrismaArtistBioRepository,
    },
    {
      provide: PDF_TEXT_EXTRACTOR,
      useClass: SimplePdfTextExtractor,
    },
    {
      provide: AI_BIO_GENERATOR,
      inject: [PlatformConfigService],
      useFactory: createArtistBioGenerator,
    },
    {
      provide: ARTIST_BIO_QUEUE,
      useClass: ArtistBioProducer,
    },
    {
      provide: RequestArtistBioUseCase,
      inject: [
        ARTIST_BIO_REPOSITORY,
        OBJECT_STORAGE,
        ARTIST_BIO_QUEUE,
        AuthorizeConcertManagementUseCase,
        PlatformConfigService,
      ],
      useFactory: (
        repository: ArtistBioRepositoryPort,
        storage: ObjectStoragePort,
        queue: ArtistBioQueuePort,
        authorize: AuthorizeConcertManagementUseCase,
        config: PlatformConfigService,
      ) =>
        new RequestArtistBioUseCase(
          repository,
          storage,
          queue,
          authorize,
          config.artistBioPdfMaxBytes,
          config.artistBioMaxAttempts,
        ),
    },
    {
      provide: GetArtistBioJobUseCase,
      inject: [ARTIST_BIO_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repository: ArtistBioRepositoryPort,
        authorize: AuthorizeConcertManagementUseCase,
      ) => new GetArtistBioJobUseCase(repository, authorize),
    },
    {
      provide: RetryArtistBioJobUseCase,
      inject: [ARTIST_BIO_REPOSITORY, ARTIST_BIO_QUEUE, AuthorizeConcertManagementUseCase],
      useFactory: (
        repository: ArtistBioRepositoryPort,
        queue: ArtistBioQueuePort,
        authorize: AuthorizeConcertManagementUseCase,
      ) => new RetryArtistBioJobUseCase(repository, queue, authorize),
    },
    {
      provide: PublishArtistBioUseCase,
      inject: [ARTIST_BIO_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repository: ArtistBioRepositoryPort,
        authorize: AuthorizeConcertManagementUseCase,
      ) => new PublishArtistBioUseCase(repository, authorize),
    },
    {
      provide: RejectArtistBioUseCase,
      inject: [ARTIST_BIO_REPOSITORY, AuthorizeConcertManagementUseCase],
      useFactory: (
        repository: ArtistBioRepositoryPort,
        authorize: AuthorizeConcertManagementUseCase,
      ) => new RejectArtistBioUseCase(repository, authorize),
    },
    {
      provide: ProcessArtistBioUseCase,
      inject: [
        ARTIST_BIO_REPOSITORY,
        OBJECT_STORAGE,
        PDF_TEXT_EXTRACTOR,
        AI_BIO_GENERATOR,
        PlatformConfigService,
      ],
      useFactory: (
        repository: ArtistBioRepositoryPort,
        storage: ObjectStoragePort,
        extractor: PdfTextExtractorPort,
        generator: AiBioGeneratorPort,
        config: PlatformConfigService,
      ) =>
        new ProcessArtistBioUseCase(
          repository,
          storage,
          extractor,
          generator,
          config.artistBioInputMaxChars,
        ),
    },
  ],
  exports: [
    ProcessArtistBioUseCase,
    RequestArtistBioUseCase,
    GetArtistBioJobUseCase,
    RetryArtistBioJobUseCase,
    PublishArtistBioUseCase,
    RejectArtistBioUseCase,
    ARTIST_BIO_REPOSITORY,
    ARTIST_BIO_QUEUE,
    PDF_TEXT_EXTRACTOR,
    AI_BIO_GENERATOR,
  ],
})
export class AiArtistBioModule {}

export { ArtistBioProcessor } from './infrastructure/queue/artist-bio.processor';
export { ArtistBioStatus } from './domain/artist-bio.types';
