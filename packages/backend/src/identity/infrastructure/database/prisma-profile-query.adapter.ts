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
      select: { email: true, displayName: true },
    });
  }
}
