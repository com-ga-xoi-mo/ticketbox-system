import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import { EmailAlreadyRegisteredError } from '../../domain/errors';
import { UserStatus } from '../../domain/user-status.enum';
import type {
  CreateUserData,
  IUserRepository,
  UpdateUserProfileData,
  UserFilter,
  UserRecord,
  UserRecordWithPassword,
} from '../../domain/ports/user-repository.port';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === PRISMA_UNIQUE_CONSTRAINT
  );
}

@Injectable()
export class PrismaUserRepository implements IUserRepository, OnModuleInit {
  private roleIdMap = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const roles = await this.prisma.role.findMany();
    for (const role of roles) {
      this.roleIdMap.set(role.code, role.id);
    }
    if (!this.roleIdMap.has('AUDIENCE')) {
      throw new Error('AUDIENCE role not found in database. Run seed first.');
    }
  }

  async createWithAudienceRole(data: CreateUserData): Promise<UserRecord> {
    return this.createWithRoles(data, ['AUDIENCE']);
  }

  async createWithRoles(data: CreateUserData, roles: string[]): Promise<UserRecord> {
    const roleIds = roles.map((r) => {
      const id = this.roleIdMap.get(r);
      if (!id) throw new Error(`Role code ${r} not found.`);
      return id;
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          displayName: data.displayName,
          roles: {
            create: roleIds.map((roleId) => ({ roleId })),
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

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) return null;
    return this.toUserRecord(user);
  }

  async findByEmail(email: string): Promise<UserRecordWithPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!user) return null;
    return this.toUserRecordWithPassword(user);
  }

  async findExistingEmails(emails: string[]): Promise<string[]> {
    if (emails.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });

    return users.map((user) => user.email);
  }

  async listUsers(filter?: UserFilter): Promise<UserRecord[]> {
    const where: Prisma.UserWhereInput = {};

    if (filter?.status) {
      where.status = filter.status as any;
    }

    if (filter?.unassigned) {
      where.checkinAssignments = {
        none: {
          status: 'ACTIVE',
        },
      };
    }
    
    if (filter?.role) {
      const roleId = this.roleIdMap.get(filter.role);
      if (roleId) {
        where.roles = {
          some: {
            roleId,
          },
        };
      } else {
        // If the role code is unknown, return an empty array or handle accordingly.
        return [];
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => this.toUserRecord(u));
  }

  async updateProfile(id: string, data: UpdateUserProfileData): Promise<UserRecord> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
        },
        include: { roles: { include: { role: true } } },
      });
      return this.toUserRecord(user);
    } catch (err) {
      if (isPrismaUniqueError(err)) {
        throw new EmailAlreadyRegisteredError(data.email || '');
      }
      throw err;
    }
  }

  async setStatus(id: string, status: UserStatus): Promise<UserRecord> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: status as any,
      },
      include: { roles: { include: { role: true } } },
    });
    return this.toUserRecord(user);
  }

  async setRoles(id: string, roles: string[]): Promise<UserRecord> {
    const roleIds = roles.map((r) => {
      const roleId = this.roleIdMap.get(r);
      if (!roleId) throw new Error(`Role code ${r} not found.`);
      return roleId;
    });

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        roles: {
          deleteMany: {},
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: { roles: { include: { role: true } } },
    });
    return this.toUserRecord(user);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private toUserRecord(user: any): UserRecord {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status as UserStatus,
      roles: user.roles.map((ur: any) => ur.role.code),
    };
  }

  private toUserRecordWithPassword(user: any): UserRecordWithPassword {
    return {
      ...this.toUserRecord(user),
      passwordHash: user.passwordHash,
    };
  }
}
