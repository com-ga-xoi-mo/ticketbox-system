import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository.port';

@Injectable()
export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(token: string, userId: string, expiresAt: Date): Promise<void> {
    await (this.prisma as any).passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  async findByToken(token: string): Promise<{ id: string; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | null> {
    const record = await (this.prisma as any).passwordResetToken.findUnique({
      where: { token },
    });
    
    if (!record) {
      return null;
    }
    
    return {
      id: record.id,
      userId: record.userId,
      token: record.token,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
    };
  }

  async markAsUsed(id: string): Promise<void> {
    await (this.prisma as any).passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date(),
      },
    });
  }
}
