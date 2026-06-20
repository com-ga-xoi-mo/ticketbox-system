import { z } from 'zod';

export const envSchema = z.object({
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
  MOMO_PARTNER_CODE: z.string().min(1).default('MOMOUDLU20220629'),
  MOMO_ACCESS_KEY: z.string().min(1).default('ggoaaJa1ECRzBRYC'),
  MOMO_SECRET_KEY: z.string().min(1).default('nI4o1MBg53oY5MWP3IHnYcxoUD2x2dm8'),
  MOMO_ENDPOINT: z.string().url().default('https://test-payment.momo.vn/v2/gateway/api/create'),
  MOMO_REQUEST_TYPE: z.string().min(1).default('captureWallet'),
  MOMO_RETURN_URL: z.string().url().default('http://localhost:3000/payment-return'),
  MOMO_IPN_URL: z.string().url().default('http://localhost:3000/payments/momo/ipn'),
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
