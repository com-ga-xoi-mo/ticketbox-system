export interface PasswordResetTokenRepository {
  create(token: string, userId: string, expiresAt: Date): Promise<void>;
  findByToken(token: string): Promise<{ id: string; userId: string; token: string; expiresAt: Date; usedAt: Date | null } | null>;
  markAsUsed(id: string): Promise<void>;
}
