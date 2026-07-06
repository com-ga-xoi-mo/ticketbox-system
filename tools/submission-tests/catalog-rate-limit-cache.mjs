import {
  assertPass,
  clearRedisPattern,
  clearSubmissionRedisState,
  countByStatus,
  createPublishedConcertWithTicketType,
  rawRequest,
  redis,
  shutdown,
  uniqueRunId,
  waitForApiHealth,
} from './lib/submission-test-utils.mjs';

async function ttlFor(key) {
  return redis.ttl(key);
}

async function scanKeys(pattern) {
  let cursor = '0';
  const keys = [];
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys.sort();
}

async function runCacheTtlEvidence() {
  const runId = uniqueRunId('catalog-cache');
  const { concert } = await createPublishedConcertWithTicketType({
    runId,
    title: 'Submission Catalog Cache Test',
    ticketCode: 'CACHE',
    totalQuantity: 20,
    maxPerUser: 4,
    priceVnd: 90_000,
  });

  await clearSubmissionRedisState();

  const list = await rawRequest('/concerts', {
    headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}` },
  });
  const detail = await rawRequest(`/concerts/${concert.slug}`, {
    headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}` },
  });
  const availability = await rawRequest(`/concerts/${concert.slug}/availability`, {
    headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 200) + 1}` },
  });

  assertPass(list.ok, 'GET /concerts failed before cache TTL check', list);
  assertPass(detail.ok, 'GET /concerts/:slug failed before cache TTL check', detail);
  assertPass(availability.ok, 'GET /concerts/:slug/availability failed before cache TTL check', availability);

  const listKeys = await scanKeys('ticketbox:cache:concert:list*');
  assertPass(listKeys.length > 0, 'Expected at least one list cache key', { listKeys });

  const listKey = listKeys[0];
  const detailKey = `ticketbox:cache:concert:detail:${concert.slug}`;
  const availabilityKey = `ticketbox:cache:concert:availability:${concert.slug}`;

  const ttls = {
    list: await ttlFor(listKey),
    detail: await ttlFor(detailKey),
    availability: await ttlFor(availabilityKey),
  };

  assertPass(ttls.list > 0 && ttls.list <= 60, 'List cache TTL should be around 60s', ttls);
  assertPass(ttls.detail > 250 && ttls.detail <= 300, 'Detail cache TTL should be around 300s', ttls);
  assertPass(
    ttls.availability > 0 && ttls.availability <= 5,
    'Availability cache TTL should be short, around 5s',
    ttls,
  );

  return {
    name: 'catalog cache TTL',
    slug: concert.slug,
    keys: { listKey, detailKey, availabilityKey },
    ttls,
  };
}

async function runBrowsingRateLimitAttack() {
  await clearRedisPattern('ticketbox:rate-limit:*');

  const requestCount = Number(process.env.BROWSING_RATE_ATTACK_REQUESTS ?? 140);
  const attackIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

  const results = await Promise.all(
    Array.from({ length: requestCount }, () =>
      rawRequest('/concerts', {
        headers: { 'x-forwarded-for': attackIp },
      }).catch((error) => ({
        status: 'ERR',
        headers: {},
        body: error instanceof Error ? error.message : String(error),
      })),
    ),
  );

  const ok = results.filter((result) => result.status >= 200 && result.status < 300);
  const throttled = results.filter((result) => result.status === 429);
  const retryAfterValues = throttled.map((result) => result.headers?.['retry-after']).filter(Boolean);

  assertPass(throttled.length > 0, 'Browsing burst should hit 429 Too Many Requests', {
    requestCount,
    statusCounts: countByStatus(results),
  });
  assertPass(ok.length <= 120, 'Browsing rate limiter allowed more than configured capacity', {
    requestCount,
    ok: ok.length,
    statusCounts: countByStatus(results),
  });
  assertPass(
    retryAfterValues.length === throttled.length,
    'Every 429 response should include Retry-After',
    {
      throttled: throttled.length,
      retryAfterValues,
      statusCounts: countByStatus(results),
    },
  );

  return {
    name: 'public browsing rate-limit burst',
    attackIp,
    requestCount,
    statusCounts: countByStatus(results),
    retryAfterSample: retryAfterValues[0],
  };
}

async function main() {
  await waitForApiHealth();
  const cache = await runCacheTtlEvidence();
  const rateLimit = await runBrowsingRateLimitAttack();

  console.log(
    JSON.stringify(
      {
        ok: true,
        script: 'catalog-rate-limit-cache',
        results: [cache, rateLimit],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          script: 'catalog-rate-limit-cache',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  })
  .finally(() => shutdown());
