import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const violations = [];

function filesUnder(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...filesUnder(path));
    else if (/\.(?:ts|tsx|mts|mjs)$/.test(entry)) files.push(path);
  }
  return files;
}

function rejectImports(directory, forbidden, label) {
  for (const file of filesUnder(directory)) {
    const source = readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(source))
        violations.push(`${label}: ${relative(root, file)} matches ${pattern}`);
    }
  }
}

rejectImports(
  resolve(root, 'packages/api-types/src'),
  [
    /from\s+['"]@ticketbox\/(?:backend|checkin-mobile)/,
    /from\s+['"].*(?:apps\/checkin-mobile|packages\/backend)/,
    /from\s+['"](?:@nestjs|@prisma|react|react-native)/,
  ],
  'api-types must remain a dependency leaf',
);

for (const layer of ['domain', 'application']) {
  for (const context of readdirSync(resolve(root, 'packages/backend/src'))) {
    const directory = resolve(root, 'packages/backend/src', context, layer);
    try {
      if (statSync(directory).isDirectory()) {
        rejectImports(directory, [/from\s+['"]@ticketbox\/api-types/], 'backend inner layer');
      }
    } catch {
      // Context has no matching inner layer.
    }
  }
}

for (const layer of ['domain', 'application']) {
  const directory = resolve(root, 'packages/backend/src/checkin', layer);
  rejectImports(
    directory,
    [
      /from\s+['"]@prisma\/client/,
      /from\s+['"].*identity\/infrastructure/,
      /from\s+['"].*concert-management\/(?:domain|application)/,
      /from\s+['"]@ticketbox\/api-types/,
    ],
    'checkin inner-layer boundary',
  );
}

if (violations.length > 0) {
  throw new Error(`API contract dependency violations:\n${violations.join('\n')}`);
}

console.log('API contract dependency boundaries verified.');
