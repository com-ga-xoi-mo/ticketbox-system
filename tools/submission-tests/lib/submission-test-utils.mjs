import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

process.env.DATABASE_URL ??= 'postgresql://ticketbox:ticketbox@localhost:5432/ticketbox?schema=public';

export const BASE_URL = process.env.SUBMISSION_TEST_BASE_URL ?? 'http://localhost:3000';
export const DEFAULT_PASSWORD = 'demoPassword';
export const ATTACK_PASSWORD = 'AttackPass123!';

export const prisma = new PrismaClient();
export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
});

export function uniqueRunId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function assertPass(condition, message, details = undefined) {
  if (!condition) {
    const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

export async function rawRequest(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = {
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
    text,
  };
}

export async function apiRequest(path, options = {}) {
  const result = await rawRequest(path, options);
  if (!result.ok) {
    throw new Error(`HTTP ${result.status} ${path}\n${JSON.stringify(result.body, null, 2)}`);
  }
  return result.body;
}

export async function waitForApiHealth(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const result = await rawRequest('/health');
      if (result.ok) return result.body;
      lastError = new Error(`HTTP ${result.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `API is not reachable at ${BASE_URL}. Start it with "npm run dev:api". Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function login(email, password = DEFAULT_PASSWORD) {
  const body = await apiRequest('/auth/login', {
    body: { email, password },
  });
  assertPass(typeof body.accessToken === 'string', 'Login response missing accessToken', body);
  return body.accessToken;
}

export async function registerAudience(email, displayName = email, password = ATTACK_PASSWORD) {
  const result = await rawRequest('/auth/register', {
    body: { email, password, displayName },
  });

  if (result.ok) {
    assertPass(
      typeof result.body?.accessToken === 'string',
      'Register response missing accessToken',
      result.body,
    );
    return result.body.accessToken;
  }

  if (result.status === 409) {
    return login(email, password);
  }

  throw new Error(`Cannot register ${email}: HTTP ${result.status}\n${JSON.stringify(result.body, null, 2)}`);
}

export async function registerAudienceUsers(count, runId) {
  const users = [];
  for (let index = 0; index < count; index += 1) {
    const email = `${runId}-user-${index}@submission.test`;
    const token = await registerAudience(email, `Submission User ${index}`);
    users.push({ email, token });
  }
  return users;
}

export async function clearRedisPattern(pattern) {
  let cursor = '0';
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = nextCursor;
    if (keys.length > 0) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== '0');

  return deleted;
}

export async function clearSubmissionRedisState() {
  const patterns = [
    'ticketbox:rate-limit:*',
    'ticketbox:idempotency:payment:initiate:*',
    'ticketbox:payment:circuit:*',
    'ticketbox:cache:concert:*',
  ];

  const result = {};
  for (const pattern of patterns) {
    result[pattern] = await clearRedisPattern(pattern);
  }
  return result;
}

export async function createPublishedConcertWithTicketType({
  runId,
  title,
  ticketCode = 'SVIP',
  totalQuantity,
  maxPerUser,
  priceVnd = 100_000,
}) {
  const organizer = await prisma.user.findUnique({
    where: { email: 'organizer@ticketbox.test' },
  });

  assertPass(
    organizer,
    'Seed organizer user not found. Run "npm run db:seed" before submission tests.',
  );

  const startsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);
  const saleStartsAt = new Date(Date.now() - 60 * 60 * 1000);
  const saleEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const slug = `${runId}-${ticketCode.toLowerCase()}`;

  const concert = await prisma.concert.create({
    data: {
      slug,
      title,
      artistName: 'Submission Test Artist',
      description: 'Isolated submission attack-test concert.',
      venueName: 'Submission Test Venue',
      venueAddress: 'Local test address',
      city: 'Ho Chi Minh City',
      startsAt,
      endsAt,
      status: 'PUBLISHED',
      createdById: organizer.id,
      publishedAt: new Date(),
    },
  });

  const zone = await prisma.seatingZone.create({
    data: {
      concertId: concert.id,
      svgElementId: `zone-${ticketCode.toLowerCase()}`,
      label: ticketCode,
      color: '#2563EB',
      displayOrder: 1,
      status: 'ACTIVE',
    },
  });

  const ticketType = await prisma.ticketType.create({
    data: {
      concertId: concert.id,
      code: ticketCode,
      name: ticketCode,
      description: 'Submission attack-test ticket type.',
      priceVnd,
      totalQuantity,
      reservedQuantity: 0,
      soldQuantity: 0,
      maxPerUser,
      saleStartsAt,
      saleEndsAt,
      status: 'ACTIVE',
    },
  });

  await prisma.ticketTypeZone.create({
    data: {
      concertId: concert.id,
      ticketTypeId: ticketType.id,
      seatingZoneId: zone.id,
    },
  });

  return { concert, ticketType };
}

export async function createOrder({ token, concertId, ticketTypeId, quantity, idempotencyKey }) {
  return apiRequest('/checkout/orders', {
    token,
    body: {
      concertId,
      idempotencyKey,
      items: [{ ticketTypeId, quantity }],
    },
  });
}

export async function summarizeOrderQuantityForTicketType(ticketTypeId) {
  const rows = await prisma.orderItem.findMany({
    where: {
      ticketTypeId,
      order: { status: { in: ['PENDING_PAYMENT', 'PAID'] } },
    },
    select: { quantity: true },
  });

  return rows.reduce((sum, row) => sum + row.quantity, 0);
}

export function countByStatus(results) {
  return results.reduce((acc, result) => {
    const key = String(result.status ?? 'ERR');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export async function shutdown() {
  await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
}
