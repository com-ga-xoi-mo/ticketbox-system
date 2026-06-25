import { randomBytes } from 'node:crypto';

import {
  ConcertNotFoundError,
  EmailAlreadyRegisteredError,
  InvalidBulkCheckinStaffRequestError,
} from '../../domain/errors';
import type { BulkCheckinStaffProvisioningRepositoryPort } from '../../domain/ports/bulk-checkin-staff-provisioning.port';
import type { PasswordHasherPort } from '../../domain/ports/password-hasher.port';
import type { IUserRepository } from '../../domain/ports/user-repository.port';
import type { AuthorizeAdminActionUseCase } from './authorize-admin-action.use-case';
import type { Actor } from './authorization.types';

export const MAX_BULK_CHECKIN_STAFF_ACCOUNTS = 100;

export interface BulkCreateCheckinStaffCommand {
  actor: Actor;
  concertId: string;
  baseEmail: string;
  quantity: number;
  displayNamePrefix: string;
}

export interface BulkCreatedCheckinStaffCredential {
  userId: string;
  displayName: string;
  email: string;
  password: string;
  assignmentId: string;
  concertId: string;
  concertTitle: string;
}

export interface BulkCreateCheckinStaffResult {
  concertId: string;
  concertTitle: string;
  credentials: BulkCreatedCheckinStaffCredential[];
}

export function generateBulkCheckinStaffEmails(baseEmail: string, quantity: number): string[] {
  validateQuantity(quantity);

  const normalized = normalizeEmail(baseEmail);
  const atIndex = normalized.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalized.lastIndexOf('@') || atIndex === normalized.length - 1) {
    throw new InvalidBulkCheckinStaffRequestError('Base email must be a valid email address.');
  }

  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const emails = Array.from({ length: quantity }, (_, index) =>
    index === 0 ? `${local}@${domain}` : `${local}${index}@${domain}`,
  );
  const uniqueEmails = new Set(emails);
  if (uniqueEmails.size !== emails.length) {
    throw new InvalidBulkCheckinStaffRequestError('Generated emails must be unique.');
  }

  return emails;
}

export function buildBulkCheckinStaffDisplayName(prefix: string, index: number): string {
  const normalizedPrefix = prefix.trim();
  if (normalizedPrefix.length === 0) {
    throw new InvalidBulkCheckinStaffRequestError('Display name prefix is required.');
  }
  if (normalizedPrefix.length > 120) {
    throw new InvalidBulkCheckinStaffRequestError(
      'Display name prefix must be at most 120 characters.',
    );
  }

  return `${normalizedPrefix} ${index + 1}`;
}

export function generateTemporaryCheckinStaffPassword(): string {
  return randomBytes(12).toString('base64url');
}

export class BulkCreateCheckinStaffUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly provisioningRepository: BulkCheckinStaffProvisioningRepositoryPort,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}

  async execute(cmd: BulkCreateCheckinStaffCommand): Promise<BulkCreateCheckinStaffResult> {
    this.authorizeAdmin.execute(cmd.actor);

    const concert = await this.provisioningRepository.findConcertSummary(cmd.concertId);
    if (!concert) {
      throw new ConcertNotFoundError(cmd.concertId);
    }

    const emails = generateBulkCheckinStaffEmails(cmd.baseEmail, cmd.quantity);
    const existingEmails = await this.userRepository.findExistingEmails(emails);
    if (existingEmails.length > 0) {
      throw new EmailAlreadyRegisteredError(existingEmails[0]);
    }

    const credentials = await Promise.all(
      emails.map(async (email, index) => {
        const password = generateTemporaryCheckinStaffPassword();
        return {
          email,
          displayName: buildBulkCheckinStaffDisplayName(cmd.displayNamePrefix, index),
          password,
          passwordHash: await this.passwordHasher.hash(password),
        };
      }),
    );

    const created = await this.provisioningRepository.createAccountsAndAssignments({
      concertId: cmd.concertId,
      accounts: credentials.map((credential) => ({
        email: credential.email,
        displayName: credential.displayName,
        passwordHash: credential.passwordHash,
      })),
    });

    const credentialByEmail = new Map(credentials.map((credential) => [credential.email, credential]));
    return {
      concertId: concert.id,
      concertTitle: concert.title,
      credentials: created.map((account) => {
        const credential = credentialByEmail.get(account.email);
        if (!credential) {
          throw new Error(`Missing generated credential for ${account.email}`);
        }

        return {
          userId: account.userId,
          displayName: account.displayName,
          email: account.email,
          password: credential.password,
          assignmentId: account.assignmentId,
          concertId: concert.id,
          concertTitle: concert.title,
        };
      }),
    };
  }
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new InvalidBulkCheckinStaffRequestError('Base email must be a valid email address.');
  }
  return normalized;
}

function validateQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BULK_CHECKIN_STAFF_ACCOUNTS) {
    throw new InvalidBulkCheckinStaffRequestError(
      `Quantity must be between 1 and ${MAX_BULK_CHECKIN_STAFF_ACCOUNTS}.`,
    );
  }
}
