import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import { normalizeEmail } from '../../domain/email-normalization';
import type {
  GoogleIdentityRepositoryPort,
  GoogleIdentityResolution,
} from '../../domain/ports/google-identity-repository.port';
import type { VerifiedGoogleIdentity } from '../../domain/ports/google-identity-verifier.port';
import type { UserRecord } from '../../domain/ports/user-repository.port';
import { UserStatus } from '../../domain/user-status.enum';

const GOOGLE = 'GOOGLE' as const;

@Injectable()
export class PrismaGoogleIdentityRepository implements GoogleIdentityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async resolveOrProvision(identity: VerifiedGoogleIdentity): Promise<GoogleIdentityResolution> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingIdentity = await tx.authIdentity.findUnique({
          where: { provider_providerSubject: { provider: GOOGLE, providerSubject: identity.subject } },
          include: { user: { include: { roles: { include: { role: true } }, avatarAsset: true } } },
        });

        if (existingIdentity) {
          await tx.authIdentity.update({
            where: { id: existingIdentity.id },
            data: {
              providerEmail: identity.email,
              providerDisplayName: identity.displayName,
              providerPictureUrl: identity.pictureUrl,
            },
          });
          return { kind: 'resolved', user: this.toUserRecord(existingIdentity.user), created: false };
        }

        const normalizedEmail = normalizeEmail(identity.email);
        const emailOwner = await tx.user.findUnique({ where: { normalizedEmail }, select: { id: true } });
        if (emailOwner) return { kind: 'account_link_required' };

        const audienceRole = await tx.role.findUnique({ where: { code: 'AUDIENCE' }, select: { id: true } });
        if (!audienceRole) throw new Error('AUDIENCE role not found in database. Run seed first.');

        const user = await tx.user.create({
          data: {
            email: identity.email.trim(),
            normalizedEmail,
            passwordHash: null,
            displayName: identity.displayName || normalizedEmail.split('@')[0] || 'Audience',
            roles: { create: [{ roleId: audienceRole.id }] },
            authIdentities: {
              create: {
                provider: GOOGLE,
                providerSubject: identity.subject,
                providerEmail: identity.email,
                providerDisplayName: identity.displayName,
                providerPictureUrl: identity.pictureUrl,
              },
            },
          },
          include: { roles: { include: { role: true } }, avatarAsset: true },
        });
        return { kind: 'resolved', user: this.toUserRecord(user), created: true };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrent = await this.prisma.authIdentity.findUnique({
          where: { provider_providerSubject: { provider: GOOGLE, providerSubject: identity.subject } },
          include: { user: { include: { roles: { include: { role: true } }, avatarAsset: true } } },
        });
        if (concurrent) {
          return { kind: 'resolved', user: this.toUserRecord(concurrent.user), created: false };
        }
        const emailOwner = await this.prisma.user.findUnique({
          where: { normalizedEmail: normalizeEmail(identity.email) },
          select: { id: true },
        });
        if (emailOwner) return { kind: 'account_link_required' };
      }
      throw error;
    }
  }

  private toUserRecord(user: any): UserRecord {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status as UserStatus,
      roles: user.roles.map((entry: any) => entry.role.code),
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
}
