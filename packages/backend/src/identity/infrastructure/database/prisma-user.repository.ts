import { Injectable, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../../../platform/database/prisma.service';
import { EmailAlreadyRegisteredError } from '../../domain/errors';
import type {
  CreateUserData,
  IUserRepository,
  UserRecord,
} from '../../domain/ports/user-repository.port';

/** Prisma error code for a unique-constraint violation */
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === PRISMA_UNIQUE_CONSTRAINT
  );
}

/**
 * Concrete implementation of IUserRepository backed by Prisma + PostgreSQL.
 *
 * This class is the ONLY place in the Identity module that imports PrismaService.
 * All upper layers (use-cases, controllers) see only the IUserRepository port.
 *
 * The AUDIENCE role ID is cached in onModuleInit() to avoid an extra DB round-trip
 * on every registration request.
 */
@Injectable()
export class PrismaUserRepository implements IUserRepository, OnModuleInit {
  /** Cached at startup — role IDs never change after seeding */
  private audienceRoleId!: string;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { code: 'AUDIENCE' } });
    if (!role) {
      throw new Error('AUDIENCE role not found in database. Run seed first.');
    }
    this.audienceRoleId = role.id;
  }

  async createWithAudienceRole(data: CreateUserData): Promise<UserRecord> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          displayName: data.displayName,
          roles: {
            create: { roleId: this.audienceRoleId },
          },
        },
        include: {
          roles: { include: { role: true } },
        },
      });

      return this.toUserRecord(user);
    } catch (err: unknown) {
      if (isPrismaUniqueError(err)) {
        throw new EmailAlreadyRegisteredError(data.email);
      }
      throw err;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) return null;
    return this.toUserRecord(user);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toUserRecord(user: {
    id: string;
    email: string;
    passwordHash: string;
    roles: Array<{ role: { code: string } }>;
  }): UserRecord {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      roles: user.roles.map((ur) => ur.role.code),
    };
  }
}
