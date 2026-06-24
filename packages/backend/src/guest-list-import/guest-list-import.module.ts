import path from 'node:path';
import { Module } from '@nestjs/common';
import { AuthModule } from '../identity/auth.module';
import { AuthorizeAdminActionUseCase } from '../identity/application/use-cases/authorize-admin-action.use-case';
import {
  CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
  type CheckinStaffAssignmentRepositoryPort,
} from '../identity/domain/ports/checkin-staff-assignment.port';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { PlatformConfigService } from '../platform/config/platform-config.service';
import { DatabaseModule } from '../platform/database/database.module';
import { QueueModule } from '../platform/queue/queue.module';
import { AdminGuestListController } from './adapters/http/admin-guest-list.controller';
import { VipGuestLookupController } from './adapters/http/vip-guest-lookup.controller';
import { ClaimGuestListImportUseCase } from './application/use-cases/claim-guest-list-import.use-case';
import { DiscoverGuestListFilesUseCase } from './application/use-cases/discover-guest-list-files.use-case';
import { GetGuestListBatchesUseCase } from './application/use-cases/get-guest-list-batches.use-case';
import { LookupVipGuestUseCase } from './application/use-cases/lookup-vip-guest.use-case';
import { ProcessGuestListImportUseCase } from './application/use-cases/process-guest-list-import.use-case';
import { ReconcileGuestListJobsUseCase } from './application/use-cases/reconcile-guest-list-jobs.use-case';
import {
  GUEST_LIST_FILE_SOURCE,
  type GuestListFileSourcePort,
} from './domain/ports/guest-list-file-source.port';
import { GUEST_LIST_QUEUE, type GuestListQueuePort } from './domain/ports/guest-list-queue.port';
import {
  GUEST_LIST_REPOSITORY,
  type GuestListRepositoryPort,
} from './domain/ports/guest-list-repository.port';
import {
  GUEST_LIST_STORAGE,
  type GuestListStoragePort,
} from './domain/ports/guest-list-storage.port';
import { GuestListCsvParser } from './infrastructure/csv/guest-list-csv.parser';
import { PrismaGuestListRepository } from './infrastructure/database/prisma-guest-list.repository';
import { LocalInboxFileSourceAdapter } from './infrastructure/file-source/local-inbox-file-source.adapter';
import { GuestListImportProducer } from './infrastructure/queue/guest-list-import.producer';
import { LocalGuestListStorageAdapter } from './infrastructure/storage/local-guest-list-storage.adapter';

@Module({
  imports: [AuthModule, DatabaseModule, PlatformConfigModule, QueueModule],
  controllers: [AdminGuestListController, VipGuestLookupController],
  providers: [
    { provide: GUEST_LIST_REPOSITORY, useClass: PrismaGuestListRepository },
    { provide: GUEST_LIST_QUEUE, useClass: GuestListImportProducer },
    {
      provide: GUEST_LIST_STORAGE,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new LocalGuestListStorageAdapter(path.resolve(config.guestListStoragePath)),
    },
    {
      provide: GUEST_LIST_FILE_SOURCE,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new LocalInboxFileSourceAdapter(
          path.resolve(config.guestListInboxPath),
          path.resolve(config.guestListArchivePath),
        ),
    },
    {
      provide: GuestListCsvParser,
      inject: [PlatformConfigService],
      useFactory: (config: PlatformConfigService) =>
        new GuestListCsvParser({
          maxBytes: config.guestListMaxBytes,
          maxRows: config.guestListMaxRows,
        }),
    },
    {
      provide: ClaimGuestListImportUseCase,
      inject: [GUEST_LIST_REPOSITORY, GUEST_LIST_STORAGE, GUEST_LIST_QUEUE],
      useFactory: (
        repository: GuestListRepositoryPort,
        storage: GuestListStoragePort,
        queue: GuestListQueuePort,
      ) => new ClaimGuestListImportUseCase(repository, storage, queue),
    },
    {
      provide: ProcessGuestListImportUseCase,
      inject: [
        GUEST_LIST_REPOSITORY,
        GUEST_LIST_STORAGE,
        GuestListCsvParser,
        PlatformConfigService,
      ],
      useFactory: (
        repository: GuestListRepositoryPort,
        storage: GuestListStoragePort,
        parser: GuestListCsvParser,
        config: PlatformConfigService,
      ) =>
        new ProcessGuestListImportUseCase(
          repository,
          storage,
          parser,
          config.guestListProcessingLeaseMs,
        ),
    },
    {
      provide: DiscoverGuestListFilesUseCase,
      inject: [GUEST_LIST_FILE_SOURCE, ClaimGuestListImportUseCase],
      useFactory: (source: GuestListFileSourcePort, claim: ClaimGuestListImportUseCase) =>
        new DiscoverGuestListFilesUseCase(source, claim),
    },
    {
      provide: ReconcileGuestListJobsUseCase,
      inject: [GUEST_LIST_REPOSITORY, GUEST_LIST_QUEUE],
      useFactory: (repository: GuestListRepositoryPort, queue: GuestListQueuePort) =>
        new ReconcileGuestListJobsUseCase(repository, queue),
    },
    {
      provide: LookupVipGuestUseCase,
      inject: [GUEST_LIST_REPOSITORY, CHECKIN_STAFF_ASSIGNMENT_REPOSITORY],
      useFactory: (
        repository: GuestListRepositoryPort,
        assignments: CheckinStaffAssignmentRepositoryPort,
      ) => new LookupVipGuestUseCase(repository, assignments),
    },
    {
      provide: GetGuestListBatchesUseCase,
      inject: [GUEST_LIST_REPOSITORY, GUEST_LIST_STORAGE, AuthorizeAdminActionUseCase],
      useFactory: (
        repository: GuestListRepositoryPort,
        storage: GuestListStoragePort,
        authorize: AuthorizeAdminActionUseCase,
      ) => new GetGuestListBatchesUseCase(repository, storage, authorize),
    },
  ],
  exports: [
    ClaimGuestListImportUseCase,
    ProcessGuestListImportUseCase,
    DiscoverGuestListFilesUseCase,
    ReconcileGuestListJobsUseCase,
    LookupVipGuestUseCase,
    GetGuestListBatchesUseCase,
    GUEST_LIST_REPOSITORY,
    GUEST_LIST_STORAGE,
    GUEST_LIST_FILE_SOURCE,
    GUEST_LIST_QUEUE,
  ],
})
export class GuestListImportModule {}

export { GuestListImportProcessor } from './infrastructure/queue/guest-list-import.processor';
export { GuestListSchedulerService } from './infrastructure/queue/guest-list-scheduler.service';
