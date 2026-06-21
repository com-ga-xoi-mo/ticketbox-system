import { GuestListEntryStatus, GuestListRowDisposition, PrismaClient } from '@prisma/client';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaimGuestListImportUseCase } from '../../packages/backend/src/guest-list-import/application/use-cases/claim-guest-list-import.use-case';
import { DiscoverGuestListFilesUseCase } from '../../packages/backend/src/guest-list-import/application/use-cases/discover-guest-list-files.use-case';
import { PrismaGuestListRepository } from '../../packages/backend/src/guest-list-import/infrastructure/database/prisma-guest-list.repository';
import { ProcessGuestListImportUseCase } from '../../packages/backend/src/guest-list-import/application/use-cases/process-guest-list-import.use-case';
import { GuestListCsvParser } from '../../packages/backend/src/guest-list-import/infrastructure/csv/guest-list-csv.parser';
import { LocalGuestListStorageAdapter } from '../../packages/backend/src/guest-list-import/infrastructure/storage/local-guest-list-storage.adapter';
import { LocalInboxFileSourceAdapter } from '../../packages/backend/src/guest-list-import/infrastructure/file-source/local-inbox-file-source.adapter';

const runWithDb = process.env.SKIP_DB_TESTS === '1' || process.env.CI === 'true' ? it.skip : it;
const prisma = new PrismaClient();
const repository = new PrismaGuestListRepository(prisma as never);
const storageRoot = path.resolve('data', 'guest-list-test-storage');
const TEST_SOURCE_PREFIX = '__guest_list_db_test__';

async function cleanDatabaseFixtures() {
  const batches = await prisma.guestListBatch.findMany({
    where: { sourceName: { startsWith: TEST_SOURCE_PREFIX } },
    select: { id: true, assetId: true },
  });
  const batchIds = batches.map(({ id }) => id);
  if (batchIds.length === 0) return;
  await prisma.guestListEntry.deleteMany({ where: { latestBatchId: { in: batchIds } } });
  await prisma.guestListBatch.deleteMany({ where: { id: { in: batchIds } } });
  const assetIds = batches.flatMap(({ assetId }) => (assetId ? [assetId] : []));
  if (assetIds.length > 0) await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
}

beforeEach(cleanDatabaseFixtures);
afterEach(cleanDatabaseFixtures);

afterAll(async () => {
  await prisma.$disconnect();
  await fs.rm(storageRoot, { recursive: true, force: true });
});

describe('guest-list PostgreSQL invariants', () => {
  runWithDb(
    'routes inbox files by concert directory and repairs a committed batch after enqueue failure',
    async () => {
      const concert = await prisma.concert.findFirstOrThrow();
      const nonce = Date.now();
      const inbox = path.join(storageRoot, `inbox-${nonce}`);
      const archive = path.join(storageRoot, `archive-${nonce}`);
      await fs.mkdir(path.join(inbox, concert.id), { recursive: true });
      await fs.mkdir(path.join(inbox, 'invalid-directory'), { recursive: true });
      const csv = `guest_name,email,phone,external_ref\nVIP,vip@x.test,0901234567,${nonce}`;
      const sourceName = `${TEST_SOURCE_PREFIX}vip.csv`;
      await fs.writeFile(path.join(inbox, concert.id, sourceName), csv);
      await fs.writeFile(path.join(inbox, 'invalid-directory', 'ignored.csv'), csv);
      const source = new LocalInboxFileSourceAdapter(inbox, archive);
      const storage = new LocalGuestListStorageAdapter(storageRoot);
      const queue = {
        ensureImportJob: vi
          .fn()
          .mockRejectedValueOnce(new Error('redis unavailable'))
          .mockResolvedValue(undefined),
      };
      const claim = new ClaimGuestListImportUseCase(repository, storage, queue);
      const discovery = new DiscoverGuestListFilesUseCase(source, claim);
      expect(await discovery.execute()).toMatchObject([
        { sourceName, ok: false, error: 'redis unavailable' },
      ]);
      expect(await discovery.execute()).toMatchObject([{ sourceName, ok: true }]);
      const checksum = (await repository.listBatches(concert.id)).find(
        (batch) => batch.sourceName === sourceName,
      )!.checksum!;
      await expect(
        fs.readFile(path.join(archive, concert.id, `${checksum}.csv`), 'utf8'),
      ).resolves.toBe(csv);
      expect(queue.ensureImportJob).toHaveBeenCalledTimes(2);
      await expect(
        prisma.guestListBatch.count({ where: { concertId: concert.id, checksum } }),
      ).resolves.toBe(1);
    },
  );

  runWithDb(
    'allocates ordered sequences and resolves concurrent same-checksum claims to one batch',
    async () => {
      const concert = await prisma.concert.findFirstOrThrow();
      const nonce = `${Date.now()}`;
      const input = {
        concertId: concert.id,
        sourceName: `${TEST_SOURCE_PREFIX}same.csv`,
        contentType: 'text/csv',
        sizeBytes: 3,
        storageKey: `test/${nonce}/same.csv`,
        checksum: nonce.padStart(64, '0').slice(-64),
      };
      const [first, second] = await Promise.all([
        repository.claimBatch(input),
        repository.claimBatch(input),
      ]);
      expect(first.batch.id).toBe(second.batch.id);
      expect([first.created, second.created].filter(Boolean)).toHaveLength(1);
      const different = await Promise.all(
        [1, 2].map((index) =>
          repository.claimBatch({
            ...input,
            sourceName: `${TEST_SOURCE_PREFIX}${index}.csv`,
            storageKey: `test/${nonce}/${index}.csv`,
            checksum: `${nonce}${index}`.padStart(64, '0').slice(-64),
          }),
        ),
      );
      expect(new Set(different.map((item) => item.batch.importSequence)).size).toBe(2);
    },
  );

  runWithDb(
    'enforces replay-safe row evidence and concert-scoped natural identifiers',
    async () => {
      const concerts = await prisma.concert.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
      const concert = concerts[0];
      const nonce = Date.now();
      const batch = await prisma.guestListBatch.create({
        data: {
          concertId: concert.id,
          sourceName: `${TEST_SOURCE_PREFIX}evidence.csv`,
          checksum: `${nonce}`.padStart(64, '0'),
          importSequence:
            ((
              await prisma.guestListBatch.aggregate({
                where: { concertId: concert.id },
                _max: { importSequence: true },
              })
            )._max.importSequence ?? 0) + 1,
        },
      });
      await prisma.guestListImportRow.upsert({
        where: { batchId_rowNumber: { batchId: batch.id, rowNumber: 2 } },
        create: { batchId: batch.id, rowNumber: 2, disposition: GuestListRowDisposition.INVALID },
        update: { disposition: GuestListRowDisposition.INVALID },
      });
      await prisma.guestListImportRow.upsert({
        where: { batchId_rowNumber: { batchId: batch.id, rowNumber: 2 } },
        create: { batchId: batch.id, rowNumber: 2, disposition: GuestListRowDisposition.IMPORTED },
        update: { disposition: GuestListRowDisposition.IMPORTED },
      });
      await expect(
        prisma.guestListImportRow.count({ where: { batchId: batch.id, rowNumber: 2 } }),
      ).resolves.toBe(1);
      const email = `constraint-${nonce}@ticketbox.test`;
      await prisma.guestListEntry.create({
        data: {
          concertId: concert.id,
          latestBatchId: batch.id,
          guestName: 'One',
          normalizedEmail: email,
          status: GuestListEntryStatus.ACTIVE,
        },
      });
      await expect(
        prisma.guestListEntry.create({
          data: {
            concertId: concert.id,
            latestBatchId: batch.id,
            guestName: 'Two',
            normalizedEmail: email,
            status: GuestListEntryStatus.ACTIVE,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
      if (concerts[1]) {
        const otherBatch = await prisma.guestListBatch.create({
          data: {
            concertId: concerts[1].id,
            sourceName: `${TEST_SOURCE_PREFIX}other.csv`,
            checksum: `${nonce}9`.padStart(64, '0').slice(-64),
            importSequence:
              ((
                await prisma.guestListBatch.aggregate({
                  where: { concertId: concerts[1].id },
                  _max: { importSequence: true },
                })
              )._max.importSequence ?? 0) + 1,
          },
        });
        await expect(
          prisma.guestListEntry.create({
            data: {
              concertId: concerts[1].id,
              latestBatchId: otherBatch.id,
              guestName: 'Other concert',
              normalizedEmail: email,
              status: GuestListEntryStatus.ACTIVE,
            },
          }),
        ).resolves.toMatchObject({ concertId: concerts[1].id });
      }
    },
  );

  runWithDb(
    'processes partial failures, preserves omitted guests, applies explicit cancellation, and retains historical evidence',
    async () => {
      const concert = await prisma.concert.findFirstOrThrow();
      const nonce = Date.now();
      const storage = new LocalGuestListStorageAdapter(storageRoot);
      const processor = new ProcessGuestListImportUseCase(
        repository,
        storage,
        new GuestListCsvParser({ maxBytes: 10000, maxRows: 100 }),
        60000,
      );
      const claim = async (name: string, csv: string) => {
        const content = Buffer.from(csv);
        const checksum = Buffer.from(`${nonce}-${name}`)
          .toString('hex')
          .padEnd(64, '0')
          .slice(0, 64);
        const key = `sources/${concert.id}/${checksum}.csv`;
        await storage.put({ key, content, contentType: 'text/csv' });
        return (
          await repository.claimBatch({
            concertId: concert.id,
            sourceName: `${TEST_SOURCE_PREFIX}${name}`,
            contentType: 'text/csv',
            sizeBytes: content.length,
            storageKey: key,
            checksum,
          })
        ).batch;
      };
      const first = await claim(
        'first',
        `guest_name,email,phone,external_ref,action\nVIP,vip-${nonce}@x.test,,,UPSERT\nBad,,bad,,UPSERT\nDuplicate,vip-${nonce}@x.test,,,UPSERT`,
      );
      await processor.execute(first.id);
      expect(await repository.summarizeRows(first.id)).toMatchObject({
        totalRows: 3,
        importedRows: 1,
        invalidRows: 1,
        duplicateRows: 1,
      });
      const active = await prisma.guestListEntry.findFirstOrThrow({
        where: { concertId: concert.id, normalizedEmail: `vip-${nonce}@x.test` },
      });
      await prisma.guestListEntry.create({
        data: {
          concertId: concert.id,
          latestBatchId: first.id,
          guestName: 'Conflict target',
          externalRef: `conflict-${nonce}`,
          status: GuestListEntryStatus.ACTIVE,
        },
      });
      const conflict = await claim(
        'conflict',
        `guest_name,email,phone,external_ref,action\nConflict,vip-${nonce}@x.test,,conflict-${nonce},UPSERT`,
      );
      await processor.execute(conflict.id);
      expect(await repository.summarizeRows(conflict.id)).toMatchObject({
        conflictRows: 1,
        importedRows: 0,
        updatedRows: 0,
      });
      const second = await claim(
        'second',
        `guest_name,email,phone,external_ref,action\nOther,other-${nonce}@x.test,,,UPSERT`,
      );
      await processor.execute(second.id);
      await expect(
        prisma.guestListEntry.findUnique({ where: { id: active.id } }),
      ).resolves.toMatchObject({ status: GuestListEntryStatus.ACTIVE });
      const cancel = await claim(
        'cancel',
        `guest_name,email,phone,external_ref,action\n,vip-${nonce}@x.test,,,CANCEL`,
      );
      await processor.execute(cancel.id);
      await expect(
        prisma.guestListEntry.findUnique({ where: { id: active.id } }),
      ).resolves.toMatchObject({ status: GuestListEntryStatus.CANCELLED });
      expect(await repository.listRows(first.id)).toHaveLength(3);
      const completedFirst = await repository.findBatch(first.id);
      const report = JSON.parse(
        (await storage.get(completedFirst!.reportStorageKey!)).toString('utf8'),
      ) as {
        summary: { totalRows: number; invalidRows: number; duplicateRows: number };
        rows: unknown[];
      };
      expect(report.summary).toMatchObject({ totalRows: 3, invalidRows: 1, duplicateRows: 1 });
      expect(report.rows).toHaveLength(3);
    },
    30_000,
  );

  runWithDb(
    'translates a real concurrent natural-key race after rollback without merging guests',
    async () => {
      const concert = await prisma.concert.findFirstOrThrow();
      const nonce = Date.now();
      const nextSequence =
        ((
          await prisma.guestListBatch.aggregate({
            where: { concertId: concert.id },
            _max: { importSequence: true },
          })
        )._max.importSequence ?? 0) + 1;
      const [firstRecord, secondRecord] = await Promise.all([
        prisma.guestListBatch.create({
          data: {
            concertId: concert.id,
            sourceName: `${TEST_SOURCE_PREFIX}concurrent-a.csv`,
            checksum: Buffer.from(`${nonce}-a`).toString('hex').padEnd(64, '0').slice(0, 64),
            importSequence: nextSequence,
          },
        }),
        prisma.guestListBatch.create({
          data: {
            concertId: concert.id,
            sourceName: `${TEST_SOURCE_PREFIX}concurrent-b.csv`,
            checksum: Buffer.from(`${nonce}-b`).toString('hex').padEnd(64, '0').slice(0, 64),
            importSequence: nextSequence + 1,
          },
        }),
      ]);
      const [firstBatch, secondBatch] = await Promise.all([
        repository.findBatch(firstRecord.id),
        repository.findBatch(secondRecord.id),
      ]);
      const normalizedEmail = `concurrent-${nonce}@x.test`;
      const [firstOutcome, secondOutcome] = await Promise.all([
        repository.applyRow(firstBatch!, {
          rowNumber: 2,
          action: 'UPSERT',
          guestName: 'Concurrent A',
          email: normalizedEmail,
          normalizedEmail,
          disposition: GuestListRowDisposition.IMPORTED,
        }),
        repository.applyRow(secondBatch!, {
          rowNumber: 2,
          action: 'UPSERT',
          guestName: 'Concurrent B',
          email: normalizedEmail,
          normalizedEmail,
          disposition: GuestListRowDisposition.IMPORTED,
        }),
      ]);
      expect([firstOutcome.disposition, secondOutcome.disposition].sort()).toEqual([
        GuestListRowDisposition.CONFLICT,
        GuestListRowDisposition.IMPORTED,
      ]);
      const winner = [firstOutcome, secondOutcome].find(
        ({ disposition }) => disposition === GuestListRowDisposition.IMPORTED,
      )!;
      await expect(
        prisma.guestListEntry.findMany({ where: { concertId: concert.id, normalizedEmail } }),
      ).resolves.toEqual([
        expect.objectContaining({ guestName: winner.guestName, normalizedEmail }),
      ]);
      const [firstSummary, secondSummary] = await Promise.all([
        repository.summarizeRows(firstRecord.id),
        repository.summarizeRows(secondRecord.id),
      ]);
      expect(firstSummary.importedRows + secondSummary.importedRows).toBe(1);
      expect(firstSummary.conflictRows + secondSummary.conflictRows).toBe(1);
      expect(firstSummary.totalRows + secondSummary.totalRows).toBe(2);
    },
    30_000,
  );

  runWithDb(
    'replays after partial progress without changing committed imported, updated, or cancelled evidence',
    async () => {
      const concert = await prisma.concert.findFirstOrThrow();
      const nonce = Date.now();
      const storage = new LocalGuestListStorageAdapter(storageRoot);
      const baseline = await prisma.guestListBatch.create({
        data: {
          concertId: concert.id,
          sourceName: `${TEST_SOURCE_PREFIX}replay-baseline`,
          checksum: Buffer.from(`${nonce}-baseline`).toString('hex').padEnd(64, '0').slice(0, 64),
          importSequence:
            ((
              await prisma.guestListBatch.aggregate({
                where: { concertId: concert.id },
                _max: { importSequence: true },
              })
            )._max.importSequence ?? 0) + 1,
          status: 'COMPLETED',
        },
      });
      const updateEmail = `replay-update-${nonce}@x.test`;
      const cancelEmail = `replay-cancel-${nonce}@x.test`;
      const [updatedGuest, cancelledGuest] = await Promise.all([
        prisma.guestListEntry.create({
          data: {
            concertId: concert.id,
            latestBatchId: baseline.id,
            guestName: 'Before update',
            normalizedEmail: updateEmail,
            email: updateEmail,
            status: GuestListEntryStatus.ACTIVE,
          },
        }),
        prisma.guestListEntry.create({
          data: {
            concertId: concert.id,
            latestBatchId: baseline.id,
            guestName: 'Before cancel',
            normalizedEmail: cancelEmail,
            email: cancelEmail,
            status: GuestListEntryStatus.ACTIVE,
          },
        }),
      ]);
      const csv = [
        'guest_name,email,phone,external_ref,action',
        `New,replay-new-${nonce}@x.test,,,UPSERT`,
        `After update,${updateEmail},,,UPSERT`,
        `,${cancelEmail},,,CANCEL`,
        `Tail,replay-tail-${nonce}@x.test,,,UPSERT`,
      ].join('\n');
      const content = Buffer.from(csv);
      const checksum = Buffer.from(`${nonce}-replay`).toString('hex').padEnd(64, '0').slice(0, 64);
      const storageKey = `sources/${concert.id}/${checksum}.csv`;
      await storage.put({ key: storageKey, content, contentType: 'text/csv' });
      const batch = (
        await repository.claimBatch({
          concertId: concert.id,
          sourceName: `${TEST_SOURCE_PREFIX}replay.csv`,
          contentType: 'text/csv',
          sizeBytes: content.length,
          storageKey,
          checksum,
        })
      ).batch;
      let appliedRows = 0;
      const flakyRepository = {
        findBatch: repository.findBatch.bind(repository),
        hasEarlierNonTerminal: repository.hasEarlierNonTerminal.bind(repository),
        claimProcessingLease: repository.claimProcessingLease.bind(repository),
        releaseProcessingLease: repository.releaseProcessingLease.bind(repository),
        applyRow: async (...args: Parameters<typeof repository.applyRow>) => {
          appliedRows += 1;
          if (appliedRows === 4) throw new Error('simulated crash after partial progress');
          return repository.applyRow(...args);
        },
        summarizeRows: repository.summarizeRows.bind(repository),
        listRows: repository.listRows.bind(repository),
        completeBatch: repository.completeBatch.bind(repository),
        failBatch: repository.failBatch.bind(repository),
      };
      const parser = new GuestListCsvParser({ maxBytes: 10000, maxRows: 100 });
      await expect(
        new ProcessGuestListImportUseCase(flakyRepository as never, storage, parser, 60000).execute(
          batch.id,
        ),
      ).rejects.toThrow('simulated crash after partial progress');
      const committedBeforeReplay = await repository.listRows(batch.id);
      expect(committedBeforeReplay.map(({ disposition }) => disposition)).toEqual([
        GuestListRowDisposition.IMPORTED,
        GuestListRowDisposition.UPDATED,
        GuestListRowDisposition.CANCELLED,
      ]);

      await new ProcessGuestListImportUseCase(repository, storage, parser, 60000).execute(batch.id);
      const committedAfterReplay = await repository.listRows(batch.id);
      expect(committedAfterReplay.slice(0, 3)).toEqual(committedBeforeReplay);
      expect(await repository.summarizeRows(batch.id)).toMatchObject({
        totalRows: 4,
        importedRows: 2,
        updatedRows: 1,
        cancelledRows: 1,
      });
      await expect(
        prisma.guestListEntry.findUniqueOrThrow({ where: { id: updatedGuest.id } }),
      ).resolves.toMatchObject({ guestName: 'After update', latestBatchId: batch.id });
      await expect(
        prisma.guestListEntry.findUniqueOrThrow({ where: { id: cancelledGuest.id } }),
      ).resolves.toMatchObject({
        status: GuestListEntryStatus.CANCELLED,
        latestBatchId: batch.id,
      });
    },
    30_000,
  );

  runWithDb('fails an invalid header atomically before changing active guests', async () => {
    const concert = await prisma.concert.findFirstOrThrow();
    const nonce = Date.now();
    const storage = new LocalGuestListStorageAdapter(storageRoot);
    const content = Buffer.from('guest_name,email\nVIP,vip@x.test');
    const checksum = Buffer.from(`${nonce}-invalid-header`)
      .toString('hex')
      .padEnd(64, '0')
      .slice(0, 64);
    const key = `sources/${concert.id}/${checksum}.csv`;
    await storage.put({ key, content, contentType: 'text/csv' });
    const batch = (
      await repository.claimBatch({
        concertId: concert.id,
        sourceName: `${TEST_SOURCE_PREFIX}invalid.csv`,
        contentType: 'text/csv',
        sizeBytes: content.length,
        storageKey: key,
        checksum,
      })
    ).batch;
    const before = await prisma.guestListEntry.count({ where: { concertId: concert.id } });
    await new ProcessGuestListImportUseCase(
      repository,
      storage,
      new GuestListCsvParser({ maxBytes: 10000, maxRows: 100 }),
      60000,
    ).execute(batch.id);
    await expect(prisma.guestListEntry.count({ where: { concertId: concert.id } })).resolves.toBe(
      before,
    );
    await expect(repository.findBatch(batch.id)).resolves.toMatchObject({
      status: 'FAILED',
      failureCode: 'INVALID_HEADER',
    });
  });
});
