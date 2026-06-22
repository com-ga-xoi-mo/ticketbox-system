import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { AuthorizeCheckinAssignmentUseCase } from '../identity/application/use-cases/authorize-checkin-assignment.use-case';
import {
  CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
  type CheckinStaffAssignmentRepositoryPort,
} from '../identity/domain/ports/checkin-staff-assignment.port';
import { DatabaseModule } from '../platform/database/database.module';
import { CheckinController } from './adapters/http/checkin.controller';
import { CheckinAssignmentsController } from './adapters/http/checkin-assignments.controller';
import { ListMyCheckinAssignmentsQuery } from './application/queries/list-my-checkin-assignments.query';
import {
  STAFF_ASSIGNMENT_QUERY,
  type StaffAssignmentQueryPort,
} from './application/ports/staff-assignment-query.port';
import { OnlineCheckinUseCase } from './application/use-cases/online-checkin.use-case';
import { BatchSyncUseCase } from './application/use-cases/batch-sync.use-case';
import { ScanValidationService } from './application/services/scan-validation.service';
import {
  CHECKIN_TICKET_REPOSITORY,
  type CheckinTicketRepositoryPort,
} from './domain/ports/checkin-ticket-repository.port';
import { QR_TOKEN_HASHER, type QrTokenHasherPort } from './domain/ports/qr-token-hasher.port';
import { PrismaCheckinTicketRepository } from './infrastructure/database/prisma-checkin-ticket.repository';
import { PrismaStaffAssignmentQueryAdapter } from './infrastructure/database/prisma-staff-assignment-query.adapter';
import { Sha256QrTokenHasher } from './infrastructure/qr/sha256-qr-token-hasher';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CheckinController, CheckinAssignmentsController],
  providers: [
    {
      provide: CHECKIN_TICKET_REPOSITORY,
      useClass: PrismaCheckinTicketRepository,
    },
    {
      provide: QR_TOKEN_HASHER,
      useClass: Sha256QrTokenHasher,
    },
    {
      provide: STAFF_ASSIGNMENT_QUERY,
      useClass: PrismaStaffAssignmentQueryAdapter,
    },
    {
      provide: ListMyCheckinAssignmentsQuery,
      inject: [STAFF_ASSIGNMENT_QUERY],
      useFactory: (assignments: StaffAssignmentQueryPort) =>
        new ListMyCheckinAssignmentsQuery(assignments),
    },
    {
      provide: ScanValidationService,
      inject: [
        CHECKIN_TICKET_REPOSITORY,
        CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
        AuthorizeCheckinAssignmentUseCase,
      ],
      useFactory: (
        ticketRepository: CheckinTicketRepositoryPort,
        assignmentRepository: CheckinStaffAssignmentRepositoryPort,
        authorizeCheckinAssignment: AuthorizeCheckinAssignmentUseCase,
      ) =>
        new ScanValidationService(
          ticketRepository,
          assignmentRepository,
          authorizeCheckinAssignment,
        ),
    },
    {
      provide: BatchSyncUseCase,
      inject: [CHECKIN_TICKET_REPOSITORY, ScanValidationService],
      useFactory: (
        ticketRepository: CheckinTicketRepositoryPort,
        validation: ScanValidationService,
      ) => new BatchSyncUseCase(ticketRepository, validation),
    },
    {
      provide: OnlineCheckinUseCase,
      inject: [
        CHECKIN_TICKET_REPOSITORY,
        CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
        AuthorizeCheckinAssignmentUseCase,
        QR_TOKEN_HASHER,
      ],
      useFactory: (
        ticketRepository: CheckinTicketRepositoryPort,
        assignmentRepository: CheckinStaffAssignmentRepositoryPort,
        authorizeCheckinAssignment: AuthorizeCheckinAssignmentUseCase,
        qrTokenHasher: QrTokenHasherPort,
      ) =>
        new OnlineCheckinUseCase(
          ticketRepository,
          assignmentRepository,
          authorizeCheckinAssignment,
          qrTokenHasher,
        ),
    },
  ],
})
export class CheckinModule {}

export { CheckinController } from './adapters/http/checkin.controller';
export { OnlineCheckinUseCase } from './application/use-cases/online-checkin.use-case';
