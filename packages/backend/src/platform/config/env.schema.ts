import { z } from 'zod';

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const optionalNonEmpty = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

export const envSchema = z
  .object({
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
    ARTIST_BIO_PDF_MAX_BYTES: z.coerce.number().int().min(1).default(5 * 1024 * 1024),
    ARTIST_BIO_INPUT_MAX_CHARS: z.coerce.number().int().min(100).default(12000),
    ARTIST_BIO_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    SEATING_MAP_SVG_MAX_BYTES: z.coerce.number().positive().default(5_242_880),
    AI_ARTIST_BIO_PROVIDER: z.enum(['local', 'gemini']).default('local'),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_API_URL: z
      .string()
      .url()
      .default('https://generativelanguage.googleapis.com/v1beta/models'),
    GEMINI_MODEL: z.string().min(1).default('gemini-1.5-flash'),
    GEMINI_TIMEOUT_MS: z.coerce.number().int().min(100).default(10000),
    STORAGE_DRIVER: z.enum(['s3', 'local']).default('local'),
    LOCAL_STORAGE_ROOT_DIR: z.string().min(1).default('data/uploads'),
    LOCAL_STORAGE_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000/storage'),
    S3_ENDPOINT: optionalUrl,
    S3_REGION: optionalNonEmpty,
    S3_BUCKET: optionalNonEmpty,
    S3_ACCESS_KEY_ID: optionalNonEmpty,
    S3_SECRET_ACCESS_KEY: optionalNonEmpty,
    S3_PUBLIC_BASE_URL: optionalUrl,
  })
  .superRefine((config, ctx) => {
    if (config.STORAGE_DRIVER !== 's3') return;

    for (const key of [
      'S3_ENDPOINT',
      'S3_REGION',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_PUBLIC_BASE_URL',
    ] as const) {
      if (!config[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when STORAGE_DRIVER=s3`,
        });
      }
    }
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
