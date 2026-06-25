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
    INTERNAL_API_KEY: z.string().min(1).default('ticketbox-internal-dev-key'),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRY: z.string().min(1).default('1h'),
    QR_TOKEN_SECRET: z.string().min(1).default('ticketbox-qr-token-dev-secret'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(1).max(31).default(12),
    ORDER_RESERVATION_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
    PAYMENT_REPAIR_ENABLED: z.preprocess(
      (value) =>
        typeof value === 'string'
          ? ['1', 'true', 'yes'].includes(value.trim().toLowerCase())
          : Boolean(value),
      z.boolean(),
    ).default(true),
    PAYMENT_REPAIR_INTERVAL_MS: z.coerce.number().int().min(1000).default(60000),
    PAYMENT_REPAIR_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(50),
    PAYMENT_REPAIR_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    PAYMENT_REPAIR_BACKOFF_MS: z.coerce.number().int().min(100).default(5000),
    MOMO_PARTNER_CODE: z.string().min(1),
    MOMO_ACCESS_KEY: z.string().min(1),
    MOMO_SECRET_KEY: z.string().min(1),
    MOMO_ENDPOINT: z.string().url().default('https://test-payment.momo.vn/v2/gateway/api/create'),
    MOMO_REQUEST_TYPE: z.string().min(1).default('captureWallet'),
    MOMO_RETURN_URL: z.string().url().default('http://localhost:3000/payment-return'),
    MOMO_IPN_URL: z.string().url().default('http://localhost:3000/payments/momo/ipn'),
    VNPAY_TMN_CODE: z.string().min(1),
    VNPAY_HASH_SECRET: z.string().min(1),
    VNPAY_PAYMENT_URL: z
      .string()
      .url()
      .default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
    VNPAY_RETURN_URL: z.string().url().default('http://localhost:3000/payments/vnpay/return'),
    VNPAY_IPN_URL: z.string().url().default('http://localhost:3000/payments/vnpay/ipn'),
    VNPAY_VERSION: z.string().min(1).default('2.1.0'),
    VNPAY_COMMAND: z.string().min(1).default('pay'),
    VNPAY_LOCALE: z.enum(['vn', 'en']).default('vn'),
    VNPAY_ORDER_TYPE: z.string().min(1).default('other'),
    VNPAY_EXPIRE_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
    EMAIL_PROVIDER: z.enum(['local', 'smtp']).default('local'),
    EMAIL_FROM: z.string().email().default('no-reply@ticketbox.test'),
    EMAIL_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    EMAIL_RETRY_BACKOFF_MS: z.coerce.number().int().min(0).default(5000),
    EMAIL_SMTP_HOST: z.string().min(1).default('localhost'),
    EMAIL_SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    EMAIL_SMTP_USER: optionalNonEmpty,
    EMAIL_SMTP_PASS: optionalNonEmpty,
    EMAIL_SMTP_SECURE: z.preprocess(
      (value) =>
        typeof value === 'string'
          ? ['1', 'true', 'yes'].includes(value.trim().toLowerCase())
          : Boolean(value),
      z.boolean(),
    ),
    MAILDEV_WEB_URL: z.string().url().optional(),
    ARTIST_BIO_PDF_MAX_BYTES: z.coerce
      .number()
      .int()
      .min(1)
      .default(5 * 1024 * 1024),
    ARTIST_BIO_INPUT_MAX_CHARS: z.coerce.number().int().min(100).default(12000),
    ARTIST_BIO_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    SEATING_MAP_SVG_MAX_BYTES: z.coerce.number().positive().default(5_242_880),
    POSTER_IMAGE_MAX_BYTES: z.coerce.number().positive().default(5_242_880),
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
    TICKET_ACCESS_BASE_URL: z.string().url().default('http://localhost:5173'),
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
