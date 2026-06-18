import { Injectable } from '@nestjs/common';
import {
  ArtistBioStatus as PrismaArtistBioStatus,
  AssetKind,
  AssetStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import { ArtistBioStatus, type ArtistBioAssetRecord, type ArtistBioRecord } from '../../domain/artist-bio.types';
import type {
  ArtistBioRepositoryPort,
  CreateArtistBioWorkflowInput,
  CreatePressKitAssetInput,
  MarkArtistBioFailedInput,
  MarkArtistBioProcessingInput,
  MarkArtistBioReadyInput,
  PublishArtistBioInput,
} from '../../domain/ports/artist-bio-repository.port';

type ArtistBioWithAsset = Prisma.ArtistBioGetPayload<{
  include: { pressKitAsset: true };
}>;

@Injectable()
export class PrismaArtistBioRepository implements ArtistBioRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createPressKitAsset(input: CreatePressKitAssetInput): Promise<ArtistBioAssetRecord> {
    const asset = await this.prisma.asset.create({
      data: {
        kind: AssetKind.PRESS_KIT,
        status: AssetStatus.ACTIVE,
        storageKey: input.storageKey,
        originalName: input.originalName,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        checksum: input.checksum,
        uploadedById: input.uploadedById,
        metadata: {
          workflowTable: 'artist_bios',
        },
      },
    });
    return this.toAssetRecord(asset);
  }

  async createWorkflow(input: CreateArtistBioWorkflowInput): Promise<ArtistBioRecord> {
    const artistBio = await this.prisma.artistBio.create({
      data: {
        concertId: input.concertId,
        pressKitAssetId: input.pressKitAssetId,
        requestedById: input.requestedById,
        status: PrismaArtistBioStatus.DRAFT,
        maxAttempts: input.maxAttempts,
        retryCount: 0,
        metadata: {
          sourceOfTruth: 'artist_bios',
          queueJob: 'artist_bio.requested',
        },
      },
      include: {
        pressKitAsset: true,
      },
    });
    return this.toRecord(artistBio);
  }

  async findById(artistBioId: string): Promise<ArtistBioRecord | null> {
    const artistBio = await this.prisma.artistBio.findUnique({
      where: { id: artistBioId },
      include: { pressKitAsset: true },
    });
    return artistBio ? this.toRecord(artistBio) : null;
  }

  async findLatestForConcert(concertId: string): Promise<ArtistBioRecord | null> {
    const artistBio = await this.prisma.artistBio.findFirst({
      where: { concertId },
      orderBy: { createdAt: 'desc' },
      include: { pressKitAsset: true },
    });
    return artistBio ? this.toRecord(artistBio) : null;
  }

  async markProcessing(input: MarkArtistBioProcessingInput): Promise<ArtistBioRecord> {
    const artistBio = await this.prisma.artistBio.update({
      where: { id: input.artistBioId },
      data: {
        status: PrismaArtistBioStatus.PROCESSING,
        retryCount: { increment: 1 },
        lastAttemptedAt: input.attemptedAt,
        nextRetryAt: null,
        errorMessage: null,
      },
      include: { pressKitAsset: true },
    });
    return this.toRecord(artistBio);
  }

  async markReady(input: MarkArtistBioReadyInput): Promise<ArtistBioRecord> {
    const artistBio = await this.prisma.artistBio.update({
      where: { id: input.artistBioId },
      data: {
        status: PrismaArtistBioStatus.READY_FOR_REVIEW,
        sourceText: input.sourceText,
        generatedBio: input.generatedBio,
        provider: input.provider,
        errorMessage: null,
        nextRetryAt: null,
      },
      include: { pressKitAsset: true },
    });
    return this.toRecord(artistBio);
  }

  async markFailed(input: MarkArtistBioFailedInput): Promise<ArtistBioRecord> {
    const artistBio = await this.prisma.artistBio.update({
      where: { id: input.artistBioId },
      data: {
        status: PrismaArtistBioStatus.FAILED,
        errorMessage: input.errorMessage,
        provider: input.provider ?? undefined,
        nextRetryAt: input.nextRetryAt ?? null,
      },
      include: { pressKitAsset: true },
    });
    return this.toRecord(artistBio);
  }

  async resetFailedForRetry(artistBioId: string): Promise<ArtistBioRecord> {
    const artistBio = await this.prisma.artistBio.update({
      where: { id: artistBioId },
      data: {
        status: PrismaArtistBioStatus.DRAFT,
        errorMessage: null,
        nextRetryAt: null,
      },
      include: { pressKitAsset: true },
    });
    return this.toRecord(artistBio);
  }

  async publish(input: PublishArtistBioInput): Promise<ArtistBioRecord> {
    const existing = await this.prisma.artistBio.findUniqueOrThrow({
      where: { id: input.artistBioId },
    });

    const artistBio = await this.prisma.artistBio.update({
      where: { id: input.artistBioId },
      data: {
        status: PrismaArtistBioStatus.PUBLISHED,
        publishedBio: existing.generatedBio,
        reviewedById: input.reviewedById,
        publishedAt: input.publishedAt,
      },
      include: { pressKitAsset: true },
    });
    return this.toRecord(artistBio);
  }

  async updateStatus(
    artistBioId: string,
    status: ArtistBioStatus,
  ): Promise<ArtistBioRecord> {
    const artistBio = await this.prisma.artistBio.update({
      where: { id: artistBioId },
      data: {
        status: status as PrismaArtistBioStatus,
      },
      include: { pressKitAsset: true },
    });
    return this.toRecord(artistBio);
  }

  private toRecord(artistBio: ArtistBioWithAsset): ArtistBioRecord {
    return {
      id: artistBio.id,
      concertId: artistBio.concertId,
      pressKitAssetId: artistBio.pressKitAssetId,
      requestedById: artistBio.requestedById,
      reviewedById: artistBio.reviewedById,
      status: artistBio.status as ArtistBioStatus,
      sourceText: artistBio.sourceText,
      generatedBio: artistBio.generatedBio,
      publishedBio: artistBio.publishedBio,
      provider: artistBio.provider,
      errorMessage: artistBio.errorMessage,
      retryCount: artistBio.retryCount,
      maxAttempts: artistBio.maxAttempts,
      lastAttemptedAt: artistBio.lastAttemptedAt,
      nextRetryAt: artistBio.nextRetryAt,
      createdAt: artistBio.createdAt,
      updatedAt: artistBio.updatedAt,
      publishedAt: artistBio.publishedAt,
      pressKitAsset: artistBio.pressKitAsset
        ? this.toAssetRecord(artistBio.pressKitAsset)
        : null,
    };
  }

  private toAssetRecord(asset: {
    id: string;
    storageKey: string;
    originalName: string | null;
    contentType: string | null;
    sizeBytes: number | null;
    checksum: string | null;
  }): ArtistBioAssetRecord {
    return {
      id: asset.id,
      storageKey: asset.storageKey,
      originalName: asset.originalName,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      checksum: asset.checksum,
    };
  }
}

