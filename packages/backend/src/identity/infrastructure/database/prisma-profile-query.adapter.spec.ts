import { describe, expect, it, vi } from 'vitest';

import { PrismaProfileQueryAdapter } from './prisma-profile-query.adapter';

describe('PrismaProfileQueryAdapter', () => {
  it('projects password/provider capabilities and keeps managed avatar separate', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: 'user@example.com',
          displayName: 'User',
          phone: null,
          dateOfBirth: null,
          gender: null,
          addressLine: null,
          city: null,
          district: null,
          avatarAssetId: 'asset-1',
          avatarAsset: { publicUrl: 'https://assets.example.com/avatar.jpg' },
          passwordHash: null,
          authIdentities: [
            { provider: 'GOOGLE', providerPictureUrl: 'https://lh3.googleusercontent.com/avatar' },
          ],
        }),
      },
    } as any;

    await expect(new PrismaProfileQueryAdapter(prisma).findByUserId('user-1')).resolves.toMatchObject({
      hasPassword: false,
      authProviders: ['GOOGLE'],
      avatarUrl: 'https://assets.example.com/avatar.jpg',
      externalAvatarUrl: 'https://lh3.googleusercontent.com/avatar',
    });
  });

  it('returns local-password capabilities without a provider', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          email: 'local@example.com',
          displayName: 'Local',
          phone: null,
          dateOfBirth: null,
          gender: null,
          addressLine: null,
          city: null,
          district: null,
          avatarAssetId: null,
          avatarAsset: null,
          passwordHash: 'hash',
          authIdentities: [],
        }),
      },
    } as any;
    await expect(new PrismaProfileQueryAdapter(prisma).findByUserId('user-1')).resolves.toMatchObject({
      hasPassword: true,
      authProviders: [],
      externalAvatarUrl: null,
    });
  });
});
