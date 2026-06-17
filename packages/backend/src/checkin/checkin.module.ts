import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { AuthorizeCheckinAssignmentUseCase } from '../identity/application/use-cases/authorize-checkin-assignment.use-case';
import {
  CHECKIN_STAFF_ASSIGNMENT_REPOSITORY,
  type CheckinStaffAssignmentRepositoryPort,
} from '../identity/domain/ports/checkin-staff-assignment.port';
import { DatabaseModule } from '../platform/database/database.module';
import { CheckinController } from './adapters/http/checkin.controller';
import { OnlineCheckinUseCase } from './application/use-cases/online-checkin.use-case';
import {
  CHECKIN_TICKET_REPOSITORY,
  type CheckinTicketRepositoryPort,
} from './domain/ports/checkin-ticket-repository.port';
import {
  QR_TOKEN_HASHER,
  type QrTokenHasherPort,
} from './domain/ports/qr-token-hasher.port';
import { PrismaCheckinTicketRepository } from './infrastructure/database/prisma-checkin-ticket.repository';
import { Sha256QrTokenHasher } from './infrastructure/qr/sha256-qr-token-hasher';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CheckinController],
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
