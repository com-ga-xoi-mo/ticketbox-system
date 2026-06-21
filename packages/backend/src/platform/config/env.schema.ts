import { z } from 'zod';
import { parseExpression } from 'cron-parser';

function isValidFiveFieldCron(value: string): boolean {
  if (value.trim().split(/\s+/).length !== 5) return false;
  try {
    parseExpression(value);
    return true;
  } catch {
    return false;
  }
}

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
  ARTIST_BIO_PDF_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .default(5 * 1024 * 1024),
  ARTIST_BIO_INPUT_MAX_CHARS: z.coerce.number().int().min(100).default(12000),
  ARTIST_BIO_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  AI_ARTIST_BIO_PROVIDER: z.enum(['local', 'gemini']).default('local'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_URL: z
    .string()
    .url()
    .default('https://generativelanguage.googleapis.com/v1beta/models'),
  GEMINI_MODEL: z.string().min(1).default('gemini-1.5-flash'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(100).default(10000),
  GUEST_LIST_DISCOVERY_CRON: z
    .string()
    .refine(isValidFiveFieldCron, 'Must be a valid five-field cron expression')
    .default('*/5 * * * *'),
  GUEST_LIST_INBOX_PATH: z.string().min(1).default('data/guest-list-inbox'),
  GUEST_LIST_ARCHIVE_PATH: z.string().min(1).default('data/guest-list-archive'),
  GUEST_LIST_STORAGE_PATH: z.string().min(1).default('data/guest-list-storage'),
  GUEST_LIST_MAX_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .default(5 * 1024 * 1024),
  GUEST_LIST_MAX_ROWS: z.coerce.number().int().min(1).max(100000).default(10000),
  GUEST_LIST_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  GUEST_LIST_RETRY_BACKOFF_MS: z.coerce.number().int().min(100).default(5000),
  GUEST_LIST_PROCESSING_LEASE_MS: z.coerce.number().int().min(1000).default(120000),
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
