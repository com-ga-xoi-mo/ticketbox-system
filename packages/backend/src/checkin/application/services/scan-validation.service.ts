import {
  CheckinGateMismatchError,
  MissingActiveCheckinAssignmentError,
} from '../../../identity/domain/errors';
import type { CheckinStaffAssignmentRepositoryPort } from '../../../identity/domain/ports/checkin-staff-assignment.port';
import type { AuthorizeCheckinAssignmentUseCase } from '../../../identity/application/use-cases/authorize-checkin-assignment.use-case';
import type {
  CheckinTicketRecord,
  InvalidScanReasonCode,
  OnlineScanActor,
  UnassignedScanReasonCode,
} from '../../domain/checkin-scan.types';
import type { CheckinTicketRepositoryPort } from '../../domain/ports/checkin-ticket-repository.port';

export interface ScanValidationCommand {
  actor: OnlineScanActor;
  assignmentId: string;
  concertId: string;
  gateName?: string;
  qrTokenHash: string;
}

export type ScanValidationResult =
  | { status: 'valid'; ticket: CheckinTicketRecord }
  | { status: 'invalid'; reasonCode: InvalidScanReasonCode; message: string; ticket?: CheckinTicketRecord }
  | { status: 'unassigned'; reasonCode: UnassignedScanReasonCode; message: string };

export class ScanValidationService {
  constructor(
    private readonly tickets: CheckinTicketRepositoryPort,
    private readonly assignments: CheckinStaffAssignmentRepositoryPort,
    private readonly authorizeAssignment: AuthorizeCheckinAssignmentUseCase,
  ) {}

  async validate(command: ScanValidationCommand): Promise<ScanValidationResult> {
    const assignmentReason = await this.assignmentFailureReason(command);
    if (assignmentReason) {
      return {
        status: 'unassigned',
        reasonCode: assignmentReason,
        message: 'Check-in staff is not assigned to this concert or gate.',
      };
    }

    const ticket = await this.tickets.findByQrTokenHash(command.qrTokenHash);
    if (!ticket) {
      return { status: 'invalid', reasonCode: 'INVALID_TICKET', message: 'Ticket QR is invalid.' };
    }
    if (ticket.concertId !== command.concertId) {
      return {
        status: 'invalid',
        reasonCode: 'WRONG_CONCERT',
        message: 'Ticket belongs to a different concert.',
        ticket,
      };
    }
    if (ticket.status === 'VOIDED' || ticket.status === 'REFUNDED') {
      return {
        status: 'invalid',
        reasonCode: 'TICKET_NOT_ISSUED',
        message: 'Ticket is not valid for check-in.',
        ticket,
      };
    }
    return { status: 'valid', ticket };
  }

  private async assignmentFailureReason(
    command: ScanValidationCommand,
  ): Promise<UnassignedScanReasonCode | undefined> {
    let authorizationFailed = false;
    try {
      await this.authorizeAssignment.execute({
        actor: command.actor,
        concertId: command.concertId,
        gateName: command.gateName,
      });
    } catch (error: unknown) {
      if (
        !(error instanceof MissingActiveCheckinAssignmentError) &&
        !(error instanceof CheckinGateMismatchError)
      ) {
        throw error;
      }
      authorizationFailed = true;
    }

    const assignment = await this.assignments.findAssignmentById(command.assignmentId);
    if (!assignment) return 'ASSIGNMENT_MISMATCH';
    if (assignment.status !== 'ACTIVE') return 'REVOKED_ASSIGNMENT';
    if (
      assignment.staffUserId !== command.actor.userId ||
      assignment.concertId !== command.concertId ||
      (command.gateName !== undefined && assignment.gateName !== command.gateName)
    ) {
      return 'ASSIGNMENT_MISMATCH';
    }
    if (authorizationFailed) return 'ASSIGNMENT_MISMATCH';
    return undefined;
  }
}
