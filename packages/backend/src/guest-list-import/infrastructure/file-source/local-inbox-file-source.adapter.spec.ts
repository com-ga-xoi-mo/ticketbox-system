import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalInboxFileSourceAdapter } from './local-inbox-file-source.adapter';

let root: string | undefined;
afterEach(async () => {
  if (root) await fs.rm(root, { recursive: true, force: true });
});
describe('LocalInboxFileSourceAdapter', () => {
  it('routes only direct regular CSV files from UUID concert directories in deterministic order and archives by checksum', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'guest-list-'));
    const inbox = path.join(root, 'inbox');
    const archive = path.join(root, 'archive');
    const concertId = '11111111-1111-4111-8111-111111111111';
    await fs.mkdir(path.join(inbox, concertId), { recursive: true });
    await fs.writeFile(path.join(inbox, concertId, 'b.csv'), 'b');
    await fs.writeFile(path.join(inbox, concertId, 'a.csv'), 'a');
    await fs.mkdir(path.join(inbox, 'not-a-uuid'));
    await fs.writeFile(path.join(inbox, 'not-a-uuid', 'ignored.csv'), 'x');
    const adapter = new LocalInboxFileSourceAdapter(inbox, archive);
    const candidates = await adapter.discover();
    expect(candidates.map((item) => item.sourceName)).toEqual(['a.csv', 'b.csv']);
    expect((await adapter.read(candidates[0])).toString()).toBe('a');
    await adapter.archive(candidates[0], 'a'.repeat(64));
    await expect(
      fs.readFile(path.join(archive, concertId, `${'a'.repeat(64)}.csv`), 'utf8'),
    ).resolves.toBe('a');
  });
  it('returns no candidates for a missing inbox and rejects path escapes', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'guest-list-'));
    const adapter = new LocalInboxFileSourceAdapter(
      path.join(root, 'missing'),
      path.join(root, 'archive'),
    );
    await expect(adapter.discover()).resolves.toEqual([]);
    await expect(
      adapter.read({
        concertId: '11111111-1111-4111-8111-111111111111',
        sourceName: 'x.csv',
        absolutePath: path.join(root, '..', 'escape.csv'),
        contentType: 'text/csv',
      }),
    ).rejects.toThrow('escapes');
  });
});
