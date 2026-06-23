import type { AuthorizeCheckinAssignmentUseCase } from '../../../identity/application/use-cases/authorize-checkin-assignment.use-case';
import type { CheckinStaffAssignmentRepositoryPort } from '../../../identity/domain/ports/checkin-staff-assignment.port';
import type {
  CheckinTicketRecord,
  InvalidScanReasonCode,
  OnlineScanCommand,
  OnlineScanReasonCode,
  OnlineScanResult,
  PersistedCheckinResult,
  UnassignedScanReasonCode,
} from '../../domain/checkin-scan.types';
import type { CheckinTicketRepositoryPort } from '../../domain/ports/checkin-ticket-repository.port';
import type { QrTokenHasherPort } from '../../domain/ports/qr-token-hasher.port';
import { ScanValidationService } from '../services/scan-validation.service';

export class OnlineCheckinUseCase {
  private readonly validation: ScanValidationService;

  constructor(
    private readonly ticketRepository: CheckinTicketRepositoryPort,
    assignmentRepository: CheckinStaffAssignmentRepositoryPort,
    authorizeCheckinAssignment: AuthorizeCheckinAssignmentUseCase,
    private readonly qrTokenHasher: QrTokenHasherPort,
  ) {
    this.validation = new ScanValidationService(
      ticketRepository,
      assignmentRepository,
      authorizeCheckinAssignment,
    );
  }

  async execute(command: OnlineScanCommand): Promise<OnlineScanResult> {
    const qrTokenHash = this.qrTokenHasher.hashPayload(command.qrPayload);
    const validation = await this.validation.validate({
      actor: command.actor,
      assignmentId: command.assignmentId,
      concertId: command.concertId,
      gateName: command.gateName,
      qrTokenHash,
    });

    if (validation.status === 'unassigned') {
      return this.recordRejected(command, {
        qrTokenHash,
        result: 'UNASSIGNED_STAFF',
        reasonCode: validation.reasonCode,
        message: validation.message,
      });
    }
    if (validation.status === 'invalid') {
      return this.recordRejected(command, {
        ticket: validation.ticket,
        qrTokenHash,
        result: validation.reasonCode === 'WRONG_CONCERT' ? 'WRONG_CONCERT' : 'INVALID',
        reasonCode: validation.reasonCode,
        message: validation.message,
      });
    }

    if (validation.ticket.checkedInAt || validation.ticket.status === 'CHECKED_IN') {
      return this.recordRejected(command, {
        ticket: validation.ticket,
        qrTokenHash,
        result: 'DUPLICATE',
        message: 'Ticket has already been checked in.',
      });
    }

    const accepted = await this.ticketRepository.recordAcceptedScan({
      ticketId: validation.ticket.id,
      concertId: command.concertId,
      staffId: command.actor.userId,
      scannedQrHash: qrTokenHash,
      deviceId: command.deviceId,
      occurredAt: command.scannedAt,
    });
    if (accepted.status === 'duplicate') {
      // Losing the atomic claim is a race-loss duplicate. Persist a DUPLICATE
      // audit event via the rejected-scan path so it has the same audit trail
      // as the early read-check duplicate path, without changing the wire
      // contract of POST /checkin/scan.
      await this.ticketRepository.recordRejectedScan({
        ticketId: accepted.ticketId,
        concertId: command.concertId,
        staffId: command.actor.userId,
        scannedQrHash: qrTokenHash,
        deviceId: command.deviceId,
        occurredAt: command.scannedAt,
        result: 'DUPLICATE',
      });
      return {
        status: 'duplicate',
        message: 'Ticket has already been checked in.',
        ticketId: accepted.ticketId,
        checkinEventId: accepted.checkinEventId,
        checkedInAt: accepted.checkedInAt,
      };
    }
    return {
      status: 'accepted',
      message: 'Ticket check-in accepted.',
      ticketId: accepted.ticketId,
      checkinEventId: accepted.checkinEventId,
      checkedInAt: accepted.checkedInAt,
    };
  }

  private async recordRejected(
    command: OnlineScanCommand,
    params: {
      ticket?: CheckinTicketRecord;
      qrTokenHash: string;
      result: Exclude<PersistedCheckinResult, 'ACCEPTED'>;
      reasonCode?: OnlineScanReasonCode;
      message: string;
    },
  ): Promise<OnlineScanResult> {
    const event = await this.ticketRepository.recordRejectedScan({
      ticketId: params.ticket?.id,
      concertId: command.concertId,
      staffId: command.actor.userId,
      scannedQrHash: params.qrTokenHash,
      deviceId: command.deviceId,
      occurredAt: command.scannedAt,
      result: params.result,
      rejectionReason: params.reasonCode,
    });
    if (params.result === 'DUPLICATE') {
      return {
        status: 'duplicate',
        message: params.message,
        ticketId: params.ticket?.id,
        checkinEventId: event?.id,
        checkedInAt: params.ticket?.checkedInAt,
      };
    }
    if (params.result === 'UNASSIGNED_STAFF') {
      return {
        status: 'unassigned',
        message: params.message,
        reasonCode: (params.reasonCode ?? 'ASSIGNMENT_MISMATCH') as UnassignedScanReasonCode,
        checkinEventId: event?.id,
      };
    }
    return {
      status: 'invalid',
      message: params.message,
      reasonCode: (params.reasonCode ?? 'INVALID_TICKET') as InvalidScanReasonCode,
      ticketId: params.ticket?.id,
      checkinEventId: event?.id,
    };
  }
}
