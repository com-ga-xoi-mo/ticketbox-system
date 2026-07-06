import { spawn } from 'node:child_process';

const scripts = [
  'tools/submission-tests/checkout-concurrency.mjs',
  'tools/submission-tests/payment-reliability.mjs',
  'tools/submission-tests/checkin-sync.mjs',
  'tools/submission-tests/catalog-rate-limit-cache.mjs',
];

function runScript(script) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script], {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });

    child.on('exit', (code) => {
      resolve({ script, code: code ?? 1 });
    });
  });
}

const results = [];

for (const script of scripts) {
  console.log(`\n=== Running ${script} ===\n`);
  // Run sequentially so Redis rate-limit/idempotency cleanup in one script does not
  // interfere with another active attack scenario.
  results.push(await runScript(script));
}

const failed = results.filter((result) => result.code !== 0);

console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      script: 'run-all',
      results,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exitCode = 1;
}
