import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  REDIS_HOST: z.string().min(1).default('localhost'),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  QUEUE_PREFIX: z.string().min(1).default('ticketbox'),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRY: z.string().min(1).default('1h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(1).max(31).default(12),
  EMAIL_PROVIDER: z.enum(['local', 'smtp']).default('local'),
  EMAIL_FROM: z.string().email().default('no-reply@ticketbox.test'),
  EMAIL_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  EMAIL_RETRY_BACKOFF_MS: z.coerce.number().int().min(0).default(5000),
  EMAIL_SMTP_HOST: z.string().min(1).default('localhost'),
  EMAIL_SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  MAILDEV_WEB_URL: z.string().url().optional(),
});

export type PlatformEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): PlatformEnv {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  return result.data;
}
