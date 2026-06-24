import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const vitestEntrypoint = join(root, 'node_modules', 'vitest', 'vitest.mjs');

const groups = [
  {
    name: 'ticket-purchase concurrency',
    proves: 'no oversell, per-user limit, inventory transition conflict handling',
    files: [
      'packages/backend/src/ordering/infrastructure/database/prisma-inventory-reservation.repository.spec.ts',
    ],
  },
  {
    name: 'payment reliability',
    proves:
      'payment initiation idempotency, duplicate callback dedupe, circuit breaker transitions',
    files: [
      'packages/backend/src/payment/application/use-cases/initiate-payment.use-case.spec.ts',
      'packages/backend/src/payment/application/use-cases/process-simulator-payment-callback.use-case.spec.ts',
      'packages/backend/src/payment/application/use-cases/process-momo-ipn.use-case.spec.ts',
      'packages/backend/src/payment/infrastructure/redis/redis-payment-idempotency.store.spec.ts',
      'packages/backend/src/payment/infrastructure/redis/redis-payment-circuit-breaker.spec.ts',
    ],
  },
  {
    name: 'platform rate limiting',
    proves:
      'allowed and blocked token bucket requests, Retry-After, endpoint isolation, fail-open/fail-closed behavior',
    files: [
      'packages/backend/src/platform/rate-limiting/redis-token-bucket.store.spec.ts',
      'packages/backend/src/platform/rate-limiting/rate-limit.service.spec.ts',
      'packages/backend/src/platform/rate-limiting/rate-limit.interceptor.spec.ts',
      'packages/backend/src/platform/rate-limiting/rate-limit-route-metadata.spec.ts',
      'packages/backend/src/platform/rate-limiting/rate-limit-actor-key.service.spec.ts',
    ],
  },
];

if (!existsSync(vitestEntrypoint)) {
  console.error(`Vitest entrypoint not found: ${vitestEntrypoint}`);
  console.error('Run npm install before running hardening evidence.');
  process.exit(1);
}

let failed = false;

for (const group of groups) {
  console.log(`\n== ${group.name} ==`);
  console.log(`Proves: ${group.proves}`);
  console.log(`Command: node ${vitestEntrypoint} run ${group.files.join(' ')}`);

  const result = spawnSync(process.execPath, [vitestEntrypoint, 'run', ...group.files], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
