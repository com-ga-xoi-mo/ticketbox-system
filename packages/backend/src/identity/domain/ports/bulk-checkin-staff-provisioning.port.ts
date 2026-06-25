import type { UserStatus } from '../user-status.enum';

export const BULK_CHECKIN_STAFF_PROVISIONING_REPOSITORY = Symbol(
  'BulkCheckinStaffProvisioningRepository',
);

export interface BulkCheckinStaffAccountInput {
  email: string;
  displayName: string;
  passwordHash: string;
}

export interface BulkCheckinStaffProvisionedAccount {
  userId: string;
  email: string;
  displayName: string;
  status: UserStatus;
  assignmentId: string;
}

export interface ConcertCredentialHandoffSummary {
  id: string;
  title: string;
}

export interface BulkCheckinStaffProvisioningRepositoryPort {
  findConcertSummary(concertId: string): Promise<ConcertCredentialHandoffSummary | null>;

  createAccountsAndAssignments(params: {
    concertId: string;
    accounts: BulkCheckinStaffAccountInput[];
  }): Promise<BulkCheckinStaffProvisionedAccount[]>;
}
