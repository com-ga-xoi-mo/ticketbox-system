import { Injectable } from '@nestjs/common';
import {
  AssetKind,
  GuestListBatchStatus,
  GuestListEntryStatus,
  GuestListRowDisposition,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import { resolveIdentity } from '../../domain/identity-resolution';
import type {
  ActiveGuestRecord,
  GuestListBatchRecord,
  GuestListReportSummary,
  ImportRowOutcome,
  ParsedGuestListRow,
} from '../../domain/guest-list.types';
import type {
  ClaimGuestListBatchInput,
  GuestListRepositoryPort,
} from '../../domain/ports/guest-list-repository.port';

const TERMINAL: GuestListBatchStatus[] = [
  GuestListBatchStatus.COMPLETED,
  GuestListBatchStatus.COMPLETED_WITH_ERRORS,
  GuestListBatchStatus.FAILED,
];

@Injectable()
export class PrismaGuestListRepository implements GuestListRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async concertExists(concertId: string): Promise<boolean> {
    return (await this.prisma.concert.count({ where: { id: concertId } })) > 0;
  }

  async claimBatch(input: ClaimGuestListBatchInput) {
    try {
      const batch = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', input.concertId);
        const existing = await tx.guestListBatch.findFirst({
          where: { concertId: input.concertId, checksum: input.checksum },
        });
        if (existing) return { record: existing, created: false };
        const aggregate = await tx.guestListBatch.aggregate({
          where: { concertId: input.concertId },
          _max: { importSequence: true },
        });
        const asset = await tx.asset.create({
          data: {
            kind: AssetKind.GUEST_LIST_CSV,
            storageKey: input.storageKey,
            originalName: input.sourceName,
            contentType: input.contentType,
            sizeBytes: input.sizeBytes,
            checksum: input.checksum,
            uploadedById: input.uploadedById,
          },
        });
        const record = await tx.guestListBatch.create({
          data: {
            concertId: input.concertId,
            assetId: asset.id,
            uploadedById: input.uploadedById,
            sourceName: input.sourceName,
            checksum: input.checksum,
            importSequence: (aggregate._max.importSequence ?? 0) + 1,
          },
        });
        return { record, created: true };
      });
      return {
        batch: {
          ...mapBatch(batch.record),
          sourceStorageKey: input.storageKey,
          sourceContentType: input.contentType,
        },
        created: batch.created,
      };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      const existing = await this.prisma.guestListBatch.findFirstOrThrow({
        where: { concertId: input.concertId, checksum: input.checksum },
        include: { asset: true },
      });
      return { batch: mapBatch(existing), created: false };
    }
  }

  async findBatch(batchId: string) {
    const batch = await this.prisma.guestListBatch.findUnique({
      where: { id: batchId },
      include: { asset: true },
    });
    return batch ? mapBatch(batch) : null;
  }

  async listBatches(concertId: string) {
    return (
      await this.prisma.guestListBatch.findMany({
        where: { concertId },
        orderBy: { importSequence: 'desc' },
        include: { asset: true },
      })
    ).map(mapBatch);
  }

  async listPendingBatchIds(): Promise<string[]> {
    const now = new Date();
    const batches = await this.prisma.guestListBatch.findMany({
      where: {
        OR: [
          { status: GuestListBatchStatus.PENDING },
          { status: GuestListBatchStatus.PROCESSING, leaseExpiresAt: { lt: now } },
        ],
      },
      select: { id: true },
    });
    return batches.map((batch) => batch.id);
  }

  async claimProcessingLease(input: {
    batchId: string;
    owner: string;
    now: Date;
    expiresAt: Date;
  }) {
    const claimed = await this.prisma.guestListBatch.updateMany({
      where: {
        id: input.batchId,
        OR: [
          { status: GuestListBatchStatus.PENDING },
          { status: GuestListBatchStatus.PROCESSING, leaseExpiresAt: { lt: input.now } },
        ],
      },
      data: {
        status: GuestListBatchStatus.PROCESSING,
        leaseOwner: input.owner,
        leaseExpiresAt: input.expiresAt,
        startedAt: input.now,
        processingAttempt: { increment: 1 },
      },
    });
    return claimed.count
      ? mapBatch(
          await this.prisma.guestListBatch.findUniqueOrThrow({
            where: { id: input.batchId },
            include: { asset: true },
          }),
        )
      : null;
  }

  async hasEarlierNonTerminal(batch: GuestListBatchRecord): Promise<boolean> {
    return (
      (await this.prisma.guestListBatch.count({
        where: {
          concertId: batch.concertId,
          importSequence: { lt: batch.importSequence },
          status: { notIn: TERMINAL },
        },
      })) > 0
    );
  }

  async releaseProcessingLease(batchId: string): Promise<void> {
    await this.prisma.guestListBatch.updateMany({
      where: { id: batchId, status: GuestListBatchStatus.PROCESSING },
      data: { status: GuestListBatchStatus.PENDING, leaseOwner: null, leaseExpiresAt: null },
    });
  }

  async findIdentityCandidates(concertId: string, row: ParsedGuestListRow) {
    const identifiers = identityWhere(row);
    if (identifiers.length === 0) return [];
    return (
      await this.prisma.guestListEntry.findMany({
        where: { concertId, OR: identifiers },
      })
    ).map(mapGuest);
  }

  async applyRow(
    batch: GuestListBatchRecord,
    requested: ImportRowOutcome,
  ): Promise<ImportRowOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingEvidence = await tx.guestListImportRow.findUnique({
          where: { batchId_rowNumber: { batchId: batch.id, rowNumber: requested.rowNumber } },
        });
        if (existingEvidence) return mapRow(existingEvidence);

        let outcome = requested;
        const evidenceOnly = new Set<GuestListRowDisposition>([
          GuestListRowDisposition.INVALID,
          GuestListRowDisposition.DUPLICATE,
        ]);
        if (!evidenceOnly.has(requested.disposition)) {
          const identifiers = identityWhere(requested);
          const candidates = identifiers.length
            ? (
                await tx.guestListEntry.findMany({
                  where: { concertId: batch.concertId, OR: identifiers },
                })
              ).map(mapGuest)
            : [];
          const resolution = resolveIdentity(requested, candidates);
          if (resolution.kind === 'conflict') {
            outcome = {
              ...requested,
              disposition: GuestListRowDisposition.CONFLICT,
              reasonCode: 'IDENTIFIER_CONFLICT',
              reasonMessage: 'Natural identifiers resolve to different guests',
            };
          } else if (requested.action === 'CANCEL') {
            if (resolution.kind !== 'match') {
              outcome = {
                ...requested,
                disposition: GuestListRowDisposition.INVALID,
                reasonCode: 'CANCEL_NOT_FOUND',
                reasonMessage: 'Cancellation does not identify one existing guest',
              };
            } else {
              const guest = await tx.guestListEntry.update({
                where: { id: resolution.guest.id },
                data: {
                  status: GuestListEntryStatus.CANCELLED,
                  cancelledAt: new Date(),
                  latestBatchId: batch.id,
                },
              });
              outcome = {
                ...requested,
                disposition: GuestListRowDisposition.CANCELLED,
                guestEntryId: guest.id,
              };
            }
          } else if (resolution.kind === 'match') {
            const guest = await tx.guestListEntry.update({
              where: { id: resolution.guest.id },
              data: {
                guestName: requested.guestName!,
                email: requested.email,
                normalizedEmail: requested.normalizedEmail,
                phone: requested.phone,
                normalizedPhone: requested.normalizedPhone,
                externalRef: requested.externalRef,
                status: GuestListEntryStatus.ACTIVE,
                cancelledAt: null,
                latestBatchId: batch.id,
              },
            });
            outcome = {
              ...requested,
              disposition: GuestListRowDisposition.UPDATED,
              guestEntryId: guest.id,
            };
          } else {
            const guest = await tx.guestListEntry.create({
              data: {
                concertId: batch.concertId,
                latestBatchId: batch.id,
                guestName: requested.guestName!,
                email: requested.email,
                normalizedEmail: requested.normalizedEmail,
                phone: requested.phone,
                normalizedPhone: requested.normalizedPhone,
                externalRef: requested.externalRef,
                status: GuestListEntryStatus.ACTIVE,
              },
            });
            outcome = {
              ...requested,
              disposition: GuestListRowDisposition.IMPORTED,
              guestEntryId: guest.id,
            };
          }
        }
        const saved = await tx.guestListImportRow.create({
          data: rowData(batch.id, outcome),
        });
        return mapRow(saved);
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      const canonicalEvidence = await this.prisma.guestListImportRow.findUnique({
        where: { batchId_rowNumber: { batchId: batch.id, rowNumber: requested.rowNumber } },
      });
      if (canonicalEvidence) return mapRow(canonicalEvidence);
      return this.persistConcurrentConflict(batch, requested, error);
    }
  }

  private async persistConcurrentConflict(
    batch: GuestListBatchRecord,
    requested: ImportRowOutcome,
    originalError: Prisma.PrismaClientKnownRequestError,
  ): Promise<ImportRowOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existingEvidence = await tx.guestListImportRow.findUnique({
          where: { batchId_rowNumber: { batchId: batch.id, rowNumber: requested.rowNumber } },
        });
        if (existingEvidence) return mapRow(existingEvidence);
        const identifiers = identityWhere(requested);
        if (identifiers.length === 0) throw originalError;
        const candidates = (
          await tx.guestListEntry.findMany({
            where: { concertId: batch.concertId, OR: identifiers },
          })
        ).map(mapGuest);
        if (resolveIdentity(requested, candidates).kind === 'none') throw originalError;
        const saved = await tx.guestListImportRow.create({
          data: rowData(batch.id, {
            ...requested,
            disposition: GuestListRowDisposition.CONFLICT,
            reasonCode: 'CONCURRENT_IDENTITY_CONFLICT',
            reasonMessage: 'A concurrent import claimed this identifier',
            guestEntryId: undefined,
          }),
        });
        return mapRow(saved);
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      const canonicalEvidence = await this.prisma.guestListImportRow.findUnique({
        where: { batchId_rowNumber: { batchId: batch.id, rowNumber: requested.rowNumber } },
      });
      if (!canonicalEvidence) throw error;
      return mapRow(canonicalEvidence);
    }
  }

  async summarizeRows(batchId: string): Promise<GuestListReportSummary> {
    const groups = await this.prisma.guestListImportRow.groupBy({
      by: ['disposition'],
      where: { batchId },
      _count: { _all: true },
    });
    const count = (value: GuestListRowDisposition) =>
      groups.find((g) => g.disposition === value)?._count._all ?? 0;
    const totalRows = groups.reduce((sum, group) => sum + group._count._all, 0);
    const invalidRows = count(GuestListRowDisposition.INVALID);
    const duplicateRows = count(GuestListRowDisposition.DUPLICATE);
    const conflictRows = count(GuestListRowDisposition.CONFLICT);
    return {
      totalRows,
      validRows: totalRows - invalidRows - duplicateRows - conflictRows,
      invalidRows,
      duplicateRows,
      conflictRows,
      importedRows: count(GuestListRowDisposition.IMPORTED),
      updatedRows: count(GuestListRowDisposition.UPDATED),
      cancelledRows: count(GuestListRowDisposition.CANCELLED),
    };
  }

  async listRows(batchId: string) {
    return (
      await this.prisma.guestListImportRow.findMany({
        where: { batchId },
        orderBy: { rowNumber: 'asc' },
      })
    ).map(mapRow);
  }

  async completeBatch(batchId: string, summary: GuestListReportSummary, reportStorageKey: string) {
    const hasErrors = summary.invalidRows + summary.duplicateRows + summary.conflictRows > 0;
    await this.prisma.guestListBatch.update({
      where: { id: batchId },
      data: {
        ...summary,
        status: hasErrors
          ? GuestListBatchStatus.COMPLETED_WITH_ERRORS
          : GuestListBatchStatus.COMPLETED,
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        reportStorageKey,
        reportContentType: 'application/json',
        failureCode: null,
        failureMessage: null,
      },
    });
  }

  async failBatch(batchId: string, code: string, message: string) {
    await this.prisma.guestListBatch.update({
      where: { id: batchId },
      data: {
        status: GuestListBatchStatus.FAILED,
        failureCode: code,
        failureMessage: message,
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
  }

  async findActiveGuest(input: {
    concertId: string;
    normalizedEmail?: string;
    normalizedPhone?: string;
    externalRef?: string;
  }) {
    const identifiers = identityWhere(input);
    if (identifiers.length !== 1) return null;
    const guest = await this.prisma.guestListEntry.findFirst({
      where: { concertId: input.concertId, status: GuestListEntryStatus.ACTIVE, OR: identifiers },
    });
    return guest ? mapGuest(guest) : null;
  }
}

function identityWhere(value: {
  normalizedEmail?: string;
  normalizedPhone?: string;
  externalRef?: string;
}): Prisma.GuestListEntryWhereInput[] {
  const where: Prisma.GuestListEntryWhereInput[] = [];
  if (value.normalizedEmail) where.push({ normalizedEmail: value.normalizedEmail });
  if (value.normalizedPhone) where.push({ normalizedPhone: value.normalizedPhone });
  if (value.externalRef) where.push({ externalRef: value.externalRef });
  return where;
}

// Prisma relation payloads vary between claim and read paths.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBatch(batch: any): GuestListBatchRecord {
  return {
    id: batch.id,
    concertId: batch.concertId,
    assetId: batch.assetId ?? undefined,
    uploadedById: batch.uploadedById ?? undefined,
    sourceName: batch.sourceName,
    sourceStorageKey: batch.asset?.storageKey ?? undefined,
    sourceContentType: batch.asset?.contentType ?? undefined,
    checksum: batch.checksum ?? undefined,
    importSequence: batch.importSequence,
    status: batch.status,
    processingAttempt: batch.processingAttempt,
    leaseOwner: batch.leaseOwner ?? undefined,
    leaseExpiresAt: batch.leaseExpiresAt ?? undefined,
    reportStorageKey: batch.reportStorageKey ?? undefined,
    failureCode: batch.failureCode ?? undefined,
    failureMessage: batch.failureMessage ?? undefined,
    createdAt: batch.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGuest(guest: any): ActiveGuestRecord {
  return {
    ...guest,
    email: guest.email ?? undefined,
    normalizedEmail: guest.normalizedEmail ?? undefined,
    phone: guest.phone ?? undefined,
    normalizedPhone: guest.normalizedPhone ?? undefined,
    externalRef: guest.externalRef ?? undefined,
    cancelledAt: guest.cancelledAt ?? undefined,
  };
}

function rowData(
  batchId: string,
  row: ImportRowOutcome,
): Prisma.GuestListImportRowUncheckedCreateInput {
  return {
    batchId,
    rowNumber: row.rowNumber,
    action: row.action,
    guestName: row.guestName,
    email: row.email,
    normalizedEmail: row.normalizedEmail,
    phone: row.phone,
    normalizedPhone: row.normalizedPhone,
    externalRef: row.externalRef,
    disposition: row.disposition,
    reasonCode: row.reasonCode,
    reasonMessage: row.reasonMessage,
    guestEntryId: row.guestEntryId,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ImportRowOutcome {
  return {
    rowNumber: row.rowNumber,
    action: row.action === 'CANCEL' ? 'CANCEL' : 'UPSERT',
    guestName: row.guestName ?? undefined,
    email: row.email ?? undefined,
    normalizedEmail: row.normalizedEmail ?? undefined,
    phone: row.phone ?? undefined,
    normalizedPhone: row.normalizedPhone ?? undefined,
    externalRef: row.externalRef ?? undefined,
    disposition: row.disposition,
    reasonCode: row.reasonCode ?? undefined,
    reasonMessage: row.reasonMessage ?? undefined,
    guestEntryId: row.guestEntryId ?? undefined,
  };
}
