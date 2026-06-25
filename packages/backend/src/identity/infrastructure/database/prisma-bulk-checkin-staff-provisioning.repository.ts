import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  BulkCheckinStaffProvisionedAccount,
  BulkCheckinStaffProvisioningRepositoryPort,
  ConcertCredentialHandoffSummary,
} from '../../domain/ports/bulk-checkin-staff-provisioning.port';
import { UserStatus } from '../../domain/user-status.enum';

const CHECKIN_STAFF_ROLE = 'CHECKIN_STAFF';
const ACTIVE_ASSIGNMENT_STATUS = 'ACTIVE';

@Injectable()
export class PrismaBulkCheckinStaffProvisioningRepository
  implements BulkCheckinStaffProvisioningRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findConcertSummary(concertId: string): Promise<ConcertCredentialHandoffSummary | null> {
    const concert = await this.prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, title: true },
    });

    return concert;
  }

  async createAccountsAndAssignments(params: {
    concertId: string;
    accounts: { email: string; displayName: string; passwordHash: string }[];
  }): Promise<BulkCheckinStaffProvisionedAccount[]> {
    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { code: CHECKIN_STAFF_ROLE },
        select: { id: true },
      });

      if (!role) {
        throw new Error('CHECKIN_STAFF role not found in database. Run seed first.');
      }

      const created: BulkCheckinStaffProvisionedAccount[] = [];
      for (const account of params.accounts) {
        const user = await tx.user.create({
          data: {
            email: account.email,
            displayName: account.displayName,
            passwordHash: account.passwordHash,
            roles: {
              create: [{ roleId: role.id }],
            },
          },
          select: {
            id: true,
            email: true,
            displayName: true,
            status: true,
          },
        });

        const assignment = await tx.checkinStaffAssignment.create({
          data: {
            staffId: user.id,
            concertId: params.concertId,
            gateName: null,
            status: ACTIVE_ASSIGNMENT_STATUS,
          },
          select: { id: true },
        });

        created.push({
          userId: user.id,
          email: user.email,
          displayName: user.displayName,
          status: user.status as UserStatus,
          assignmentId: assignment.id,
        });
      }

      return created;
    });
  }
}
