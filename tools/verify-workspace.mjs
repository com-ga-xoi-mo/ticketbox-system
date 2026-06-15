import { readFile } from 'node:fs/promises';

const requiredScripts = [
  'start:deps',
  'stop:deps',
  'dev:api',
  'dev:worker',
  'build',
  'lint',
  'format',
  'format:check',
  'test',
  'health',
];

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

if (!packageJson.private) {
  throw new Error('Root package must be private.');
}

if (!Array.isArray(packageJson.workspaces) || packageJson.workspaces.length === 0) {
  throw new Error('Root package must define npm workspaces.');
}

if (missingScripts.length > 0) {
  throw new Error(`Missing package scripts: ${missingScripts.join(', ')}`);
}

console.log('Workspace configuration verified.');
