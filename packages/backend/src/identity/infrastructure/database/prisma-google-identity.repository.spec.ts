import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { PrismaGoogleIdentityRepository } from './prisma-google-identity.repository';

const identity = {
  subject: 'google-subject',
  email: ' User@Example.com ',
  displayName: 'Google User',
  pictureUrl: 'https://lh3.googleusercontent.com/avatar',
};

const user = {
  id: 'user-1',
  email: 'User@Example.com',
  displayName: 'Google User',
  status: 'ACTIVE',
  roles: [{ role: { code: 'AUDIENCE' } }],
  avatarAsset: null,
  avatarAssetId: null,
};

function makePrisma(txOverrides: Record<string, unknown> = {}) {
  const tx = {
    authIdentity: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(user),
    },
    role: { findUnique: vi.fn().mockResolvedValue({ id: 'audience-role' }) },
    ...txOverrides,
  } as any;
  const prisma = {
    $transaction: vi.fn(async (callback: (client: any) => unknown) => callback(tx)),
    authIdentity: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
  } as any;
  return { prisma, tx };
}

describe('PrismaGoogleIdentityRepository', () => {
  it('returns a linked user and refreshes provider metadata', async () => {
    const { prisma, tx } = makePrisma();
    tx.authIdentity.findUnique.mockResolvedValue({ id: 'identity-1', user });
    const result = await new PrismaGoogleIdentityRepository(prisma).resolveOrProvision(identity);

    expect(result).toMatchObject({ kind: 'resolved', created: false, user: { id: 'user-1' } });
    expect(tx.authIdentity.update).toHaveBeenCalledWith({
      where: { id: 'identity-1' },
      data: {
        providerEmail: identity.email,
        providerDisplayName: identity.displayName,
        providerPictureUrl: identity.pictureUrl,
      },
    });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('returns account-link-required for a case-variant existing email', async () => {
    const { prisma, tx } = makePrisma();
    tx.user.findUnique.mockResolvedValue({ id: 'existing-user' });
    await expect(new PrismaGoogleIdentityRepository(prisma).resolveOrProvision(identity)).resolves.toEqual({
      kind: 'account_link_required',
    });
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { normalizedEmail: 'user@example.com' },
      select: { id: true },
    });
  });

  it('atomically creates a null-password audience user and identity', async () => {
    const { prisma, tx } = makePrisma();
    const result = await new PrismaGoogleIdentityRepository(prisma).resolveOrProvision(identity);
    expect(result).toMatchObject({ kind: 'resolved', created: true });
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          normalizedEmail: 'user@example.com',
          passwordHash: null,
          roles: { create: [{ roleId: 'audience-role' }] },
          authIdentities: { create: expect.objectContaining({ provider: 'GOOGLE' }) },
        }),
      }),
    );
  });

  it('converges on the identity created by a concurrent first login', async () => {
    const { prisma } = makePrisma();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique conflict', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    prisma.authIdentity.findUnique.mockResolvedValue({ id: 'identity-1', user });

    await expect(new PrismaGoogleIdentityRepository(prisma).resolveOrProvision(identity)).resolves.toMatchObject({
      kind: 'resolved',
      created: false,
      user: { id: 'user-1' },
    });
  });

  it('maps a concurrent normalized-email conflict to account-link-required', async () => {
    const { prisma } = makePrisma();
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique conflict', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    prisma.authIdentity.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(new PrismaGoogleIdentityRepository(prisma).resolveOrProvision(identity)).resolves.toEqual({
      kind: 'account_link_required',
    });
  });
});
