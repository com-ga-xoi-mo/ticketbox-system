import { Injectable } from '@nestjs/common';

import type {
  ProfileProjection,
  ProfileQueryPort,
} from '../../application/ports/profile-query.port';
import { PrismaService } from '../../../platform/database/prisma.service';

@Injectable()
export class PrismaProfileQueryAdapter implements ProfileQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<ProfileProjection | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        displayName: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
        addressLine: true,
        city: true,
        district: true,
        avatarAssetId: true,
        avatarAsset: { select: { publicUrl: true } },
      },
    }).then((user) => user ? {
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      addressLine: user.addressLine,
      city: user.city,
      district: user.district,
      avatarAssetId: user.avatarAssetId,
      avatarUrl: user.avatarAsset?.publicUrl ?? null,
    } : null);
  }
}
