import {
  CheckinGateMismatchError,
  MissingActiveCheckinAssignmentError,
} from '../../../identity/domain/errors';
import type { CheckinStaffAssignmentRepositoryPort } from '../../../identity/domain/ports/checkin-staff-assignment.port';
import type { AuthorizeCheckinAssignmentUseCase } from '../../../identity/application/use-cases/authorize-checkin-assignment.use-case';
import type {
  CheckinTicketRecord,
  OnlineScanCommand,
  OnlineScanReasonCode,
  OnlineScanResult,
  InvalidScanReasonCode,
  PersistedCheckinResult,
  UnassignedScanReasonCode,
} from '../../domain/checkin-scan.types';
import type { CheckinTicketRepositoryPort } from '../../domain/ports/checkin-ticket-repository.port';
import type { QrTokenHasherPort } from '../../domain/ports/qr-token-hasher.port';

export class OnlineCheckinUseCase {
  constructor(
    private readonly ticketRepository: CheckinTicketRepositoryPort,
    private readonly assignmentRepository: CheckinStaffAssignmentRepositoryPort,
    private readonly authorizeCheckinAssignment: AuthorizeCheckinAssignmentUseCase,
    private readonly qrTokenHasher: QrTokenHasherPort,
  ) {}

  async execute(cmd: OnlineScanCommand): Promise<OnlineScanResult> {
    const qrTokenHash = this.qrTokenHasher.hashPayload(cmd.qrPayload);
    const assignmentResult = await this.verifyAssignment(cmd, qrTokenHash);
    if (assignmentResult) {
      return assignmentResult;
    }

    const ticket = await this.ticketRepository.findByQrTokenHash(qrTokenHash);
    if (!ticket) {
      return this.recordRejected(cmd, {
        qrTokenHash,
        result: 'INVALID',
        reasonCode: 'INVALID_TICKET',
        message: 'Ticket QR is invalid.',
      });
    }

    if (ticket.concertId !== cmd.concertId) {
      return this.recordRejected(cmd, {
        ticket,
        qrTokenHash,
        result: 'WRONG_CONCERT',
        reasonCode: 'WRONG_CONCERT',
        message: 'Ticket belongs to a different concert.',
      });
    }

    if (ticket.status === 'VOIDED' || ticket.status === 'REFUNDED') {
      return this.recordRejected(cmd, {
        ticket,
        qrTokenHash,
        result: 'INVALID',
        reasonCode: 'TICKET_NOT_ISSUED',
        message: 'Ticket is not valid for check-in.',
      });
    }

    if (ticket.checkedInAt || ticket.status === 'CHECKED_IN') {
      return this.recordRejected(cmd, {
        ticket,
        qrTokenHash,
        result: 'DUPLICATE',
        message: 'Ticket has already been checked in.',
      });
    }

    const hasAcceptedCheckin = await this.ticketRepository.hasAcceptedCheckin(ticket.id);
    if (hasAcceptedCheckin) {
      return this.recordRejected(cmd, {
        ticket,
        qrTokenHash,
        result: 'DUPLICATE',
        message: 'Ticket has already been checked in.',
      });
    }

    const accepted = await this.ticketRepository.recordAcceptedScan({
      ticketId: ticket.id,
      concertId: cmd.concertId,
      staffId: cmd.actor.userId,
      scannedQrHash: qrTokenHash,
      deviceId: cmd.deviceId,
      occurredAt: cmd.scannedAt,
    });

    if (accepted.status === 'duplicate') {
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

  private async verifyAssignment(
    cmd: OnlineScanCommand,
    qrTokenHash: string,
  ): Promise<OnlineScanResult | null> {
    try {
      await this.authorizeCheckinAssignment.execute({
        actor: cmd.actor,
        concertId: cmd.concertId,
        gateName: cmd.gateName,
      });
    } catch (err: unknown) {
      if (
        err instanceof MissingActiveCheckinAssignmentError ||
        err instanceof CheckinGateMismatchError
      ) {
        const reasonCode = await this.getAssignmentFailureReason(cmd);
        return this.recordRejected(cmd, {
          qrTokenHash,
          result: 'UNASSIGNED_STAFF',
          reasonCode,
          message: 'Check-in staff is not assigned to this concert or gate.',
        });
      }
      throw err;
    }

    const reasonCode = await this.getAssignmentFailureReason(cmd);
    if (reasonCode) {
      return this.recordRejected(cmd, {
        qrTokenHash,
        result: 'UNASSIGNED_STAFF',
        reasonCode,
        message: 'Selected check-in assignment does not match this scan.',
      });
    }

    return null;
  }

  private async getAssignmentFailureReason(
    cmd: OnlineScanCommand,
  ): Promise<UnassignedScanReasonCode | undefined> {
    const assignment = await this.assignmentRepository.findAssignmentById(cmd.assignmentId);
    if (!assignment) {
      return 'ASSIGNMENT_MISMATCH';
    }

    const gateMatches = !cmd.gateName || assignment.gateName === cmd.gateName;
    const assignmentMatches =
      assignment.staffUserId === cmd.actor.userId &&
      assignment.concertId === cmd.concertId &&
      gateMatches;

    if (!assignmentMatches) {
      return 'ASSIGNMENT_MISMATCH';
    }

    if (assignment.status !== 'ACTIVE') {
      return 'REVOKED_ASSIGNMENT';
    }

    return undefined;
  }

  private async recordRejected(
    cmd: OnlineScanCommand,
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
      concertId: cmd.concertId,
      staffId: cmd.actor.userId,
      scannedQrHash: params.qrTokenHash,
      deviceId: cmd.deviceId,
      occurredAt: cmd.scannedAt,
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
