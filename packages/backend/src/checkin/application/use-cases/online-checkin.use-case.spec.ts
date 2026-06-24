import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MissingActiveCheckinAssignmentError } from '../../../identity/domain/errors';
import type { CheckinStaffAssignmentRepositoryPort } from '../../../identity/domain/ports/checkin-staff-assignment.port';
import { Role } from '../../../identity/domain/role.enum';
import type { AuthorizeCheckinAssignmentUseCase } from '../../../identity/application/use-cases/authorize-checkin-assignment.use-case';
import type { CheckinTicketRepositoryPort } from '../../domain/ports/checkin-ticket-repository.port';
import type { QrTokenHasherPort } from '../../domain/ports/qr-token-hasher.port';
import { OnlineCheckinUseCase } from './online-checkin.use-case';

const scannedAt = new Date('2026-06-17T10:00:00.000Z');

function makeCommand(overrides: Partial<Parameters<OnlineCheckinUseCase['execute']>[0]> = {}) {
  return {
    actor: { userId: 'staff-1', roles: [Role.CHECKIN_STAFF] },
    assignmentId: 'assignment-1',
    concertId: 'concert-1',
    gateName: 'Main Gate',
    qrPayload: 'qr-payload',
    scannedAt,
    deviceId: 'device-1',
    ...overrides,
  };
}

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    concertId: 'concert-1',
    status: 'ISSUED' as const,
    qrTokenHash: 'hash-1',
    ...overrides,
  };
}

describe('OnlineCheckinUseCase', () => {
  let ticketRepository: CheckinTicketRepositoryPort;
  let assignmentRepository: CheckinStaffAssignmentRepositoryPort;
  let authorizeCheckinAssignment: Pick<AuthorizeCheckinAssignmentUseCase, 'execute'>;
  let qrTokenHasher: QrTokenHasherPort;
  let useCase: OnlineCheckinUseCase;

  beforeEach(() => {
    ticketRepository = {
      findByQrTokenHash: vi.fn(),
      hasAcceptedCheckin: vi.fn(),
      recordAcceptedScan: vi.fn(),
      recordRejectedScan: vi.fn(),
      findOfflineEvent: vi.fn(),
      recordOfflineOutcome: vi.fn(),
    };
    assignmentRepository = {
      findAssignmentById: vi.fn(),
      findActiveAssignment: vi.fn(),
      listActiveAssignments: vi.fn(),
      createActiveAssignment: vi.fn(),
      revokeAssignment: vi.fn(),
      revokeAllForStaffUser: vi.fn(),
      userHasCheckinStaffRole: vi.fn(),
    };
    authorizeCheckinAssignment = { execute: vi.fn() };
    qrTokenHasher = { hashPayload: vi.fn(() => 'hash-1') };

    vi.mocked(assignmentRepository.findAssignmentById).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      gateName: 'Main Gate',
      status: 'ACTIVE',
      assignedAt: scannedAt,
    });
    vi.mocked(ticketRepository.recordRejectedScan).mockResolvedValue({
      id: 'event-rejected',
    });

    useCase = new OnlineCheckinUseCase(
      ticketRepository,
      assignmentRepository,
      authorizeCheckinAssignment as AuthorizeCheckinAssignmentUseCase,
      qrTokenHasher,
    );
  });

  it('accepts a valid unused ticket', async () => {
    vi.mocked(ticketRepository.findByQrTokenHash).mockResolvedValue(makeTicket());
    vi.mocked(ticketRepository.hasAcceptedCheckin).mockResolvedValue(false);
    vi.mocked(ticketRepository.recordAcceptedScan).mockResolvedValue({
      status: 'accepted',
      ticketId: 'ticket-1',
      checkinEventId: 'event-1',
      checkedInAt: scannedAt,
    });

    await expect(useCase.execute(makeCommand())).resolves.toMatchObject({
      status: 'accepted',
      ticketId: 'ticket-1',
      checkinEventId: 'event-1',
    });
  });

  it('returns invalid when the QR payload does not match a ticket', async () => {
    vi.mocked(ticketRepository.findByQrTokenHash).mockResolvedValue(null);

    await expect(useCase.execute(makeCommand())).resolves.toMatchObject({
      status: 'invalid',
      reasonCode: 'INVALID_TICKET',
    });
  });

  it('returns invalid with WRONG_CONCERT for another concert ticket', async () => {
    vi.mocked(ticketRepository.findByQrTokenHash).mockResolvedValue(
      makeTicket({ concertId: 'concert-2' }),
    );

    await expect(useCase.execute(makeCommand())).resolves.toMatchObject({
      status: 'invalid',
      reasonCode: 'WRONG_CONCERT',
      ticketId: 'ticket-1',
    });
  });

  it('returns duplicate for an already checked-in ticket', async () => {
    vi.mocked(ticketRepository.findByQrTokenHash).mockResolvedValue(
      makeTicket({ status: 'CHECKED_IN', checkedInAt: scannedAt }),
    );

    await expect(useCase.execute(makeCommand())).resolves.toMatchObject({
      status: 'duplicate',
      ticketId: 'ticket-1',
    });
  });

  it('returns unassigned when active assignment authorization fails', async () => {
    vi.mocked(authorizeCheckinAssignment.execute).mockRejectedValue(
      new MissingActiveCheckinAssignmentError('concert-1'),
    );
    vi.mocked(assignmentRepository.findAssignmentById).mockResolvedValue(null);

    await expect(useCase.execute(makeCommand())).resolves.toMatchObject({
      status: 'unassigned',
      reasonCode: 'ASSIGNMENT_MISMATCH',
    });

    expect(ticketRepository.findByQrTokenHash).not.toHaveBeenCalled();
  });

  it('returns unassigned with REVOKED_ASSIGNMENT for a revoked selected assignment', async () => {
    vi.mocked(assignmentRepository.findAssignmentById).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-1',
      concertId: 'concert-1',
      gateName: 'Main Gate',
      status: 'REVOKED',
      assignedAt: scannedAt,
      revokedAt: scannedAt,
    });

    await expect(useCase.execute(makeCommand())).resolves.toMatchObject({
      status: 'unassigned',
      reasonCode: 'REVOKED_ASSIGNMENT',
    });
  });

  it('returns unassigned with ASSIGNMENT_MISMATCH for a selected assignment owned by another staff user', async () => {
    vi.mocked(assignmentRepository.findAssignmentById).mockResolvedValue({
      id: 'assignment-1',
      staffUserId: 'staff-2',
      concertId: 'concert-1',
      gateName: 'Main Gate',
      status: 'ACTIVE',
      assignedAt: scannedAt,
    });

    await expect(useCase.execute(makeCommand())).resolves.toMatchObject({
      status: 'unassigned',
      reasonCode: 'ASSIGNMENT_MISMATCH',
    });
  });
});
