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
          phone: data.phone ?? null,
          dateOfBirth: data.dateOfBirth ?? null,
          gender: data.gender as any,
          addressLine: data.addressLine ?? null,
          city: data.city ?? null,
          district: data.district ?? null,
          roles: {
            create: roleIds.map((roleId) => ({ roleId })),
          },
        },
        include: {
          roles: { include: { role: true } },
          avatarAsset: true,
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
      include: { roles: { include: { role: true } }, avatarAsset: true },
    });
    if (!user) return null;
    return this.toUserRecord(user);
  }


  async findByIdWithPassword(id: string): Promise<UserRecordWithPassword | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } }, avatarAsset: true },
    });
    if (!user) return null;
    return this.toUserRecordWithPassword(user);
  }


  async replaceAvatar(userId: string, newAsset: { id: string; storageKey: string; publicUrl: string; originalName: string; contentType: string; sizeBytes: number }): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { avatarAsset: true },
      });
      if (!user) throw new Error('User not found');

      const previousStorageKey = user.avatarAsset?.storageKey ?? null;
      const previousAssetId = user.avatarAssetId;

      await tx.asset.create({
        data: {
          id: newAsset.id,
          kind: 'USER_AVATAR',
          status: 'ACTIVE',
          storageKey: newAsset.storageKey,
          publicUrl: newAsset.publicUrl,
          originalName: newAsset.originalName,
          contentType: newAsset.contentType,
          sizeBytes: newAsset.sizeBytes,
          uploadedById: userId,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { avatarAssetId: newAsset.id },
      });

      if (previousAssetId) {
        await tx.asset.delete({ where: { id: previousAssetId } });
      }

      return previousStorageKey;
    });
  }

  async clearAvatar(userId: string): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { avatarAsset: true },
      });
      if (!user) throw new Error('User not found');

      const previousStorageKey = user.avatarAsset?.storageKey ?? null;
      const previousAssetId = user.avatarAssetId;

      if (!previousAssetId) return null;

      await tx.user.update({
        where: { id: userId },
        data: { avatarAssetId: null },
      });

      await tx.asset.delete({ where: { id: previousAssetId } });

      return previousStorageKey;
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
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
      include: { roles: { include: { role: true } }, avatarAsset: true },
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
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.dateOfBirth !== undefined ? { dateOfBirth: data.dateOfBirth } : {}),
          ...(data.gender !== undefined ? { gender: data.gender as any } : {}),
          ...(data.addressLine !== undefined ? { addressLine: data.addressLine } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.district !== undefined ? { district: data.district } : {}),
        },
        include: { roles: { include: { role: true } }, avatarAsset: true },
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
      include: { roles: { include: { role: true } }, avatarAsset: true },
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
      include: { roles: { include: { role: true } }, avatarAsset: true },
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
      phone: user.phone ?? null,
      dateOfBirth: user.dateOfBirth ?? null,
      gender: user.gender ?? null,
      addressLine: user.addressLine ?? null,
      city: user.city ?? null,
      district: user.district ?? null,
      avatarAssetId: user.avatarAssetId ?? null,
      avatarUrl: user.avatarAsset?.publicUrl ?? null,
    };
  }

  private toUserRecordWithPassword(user: any): UserRecordWithPassword {
    return {
      ...this.toUserRecord(user),
      passwordHash: user.passwordHash,
    };
  }
}
