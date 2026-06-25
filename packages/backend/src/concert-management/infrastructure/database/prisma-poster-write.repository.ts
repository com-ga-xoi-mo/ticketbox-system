import { Injectable } from '@nestjs/common';
import { AssetKind, AssetStatus, type Asset } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  CreatePosterAssetData,
  PosterWriteRepositoryPort,
} from '../../domain/ports/poster-write.port';
import type { PosterAsset } from '../../domain/poster.types';

@Injectable()
export class PrismaPosterWriteRepository implements PosterWriteRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createAssetAndAssociateConcertPoster(
    assetData: CreatePosterAssetData,
    concertId: string,
    oldAssetId?: string,
  ): Promise<{
    asset: PosterAsset;
    concert: { id: string; posterAssetId: string };
    replacedStorageKey: string | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const concert = await tx.concert.findUnique({
        where: { id: concertId },
        select: { id: true, posterAssetId: true },
      });
      const currentAssetId = oldAssetId ?? concert?.posterAssetId ?? undefined;

      const asset = await tx.asset.create({
        data: {
          id: assetData.id,
          kind: AssetKind.POSTER,
          status: AssetStatus.ACTIVE,
          storageKey: assetData.storageKey,
          publicUrl: assetData.publicUrl,
          originalName: assetData.originalName,
          contentType: assetData.contentType,
          sizeBytes: assetData.sizeBytes,
          checksum: assetData.checksum,
          uploadedById: assetData.uploadedById,
        },
      });

      const updatedConcert = await tx.concert.update({
        where: { id: concertId },
        data: { posterAssetId: asset.id },
        select: { id: true, posterAssetId: true },
      });

      let replacedStorageKey: string | null = null;
      if (currentAssetId && currentAssetId !== asset.id) {
        const previousAsset = await tx.asset.findUnique({
          where: { id: currentAssetId },
          select: { storageKey: true },
        });
        replacedStorageKey = previousAsset?.storageKey ?? null;
        await tx.asset.delete({ where: { id: currentAssetId } });
      }

      return {
        asset: this.toDomain(asset),
        concert: {
          id: updatedConcert.id,
          posterAssetId: updatedConcert.posterAssetId ?? asset.id,
        },
        replacedStorageKey,
      };
    });
  }

  async findAssetById(id: string): Promise<PosterAsset | null> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    return asset ? this.toDomain(asset) : null;
  }

  private toDomain(asset: Asset): PosterAsset {
    return {
      id: asset.id,
      kind: asset.kind,
      status: asset.status,
      storageKey: asset.storageKey,
      publicUrl: asset.publicUrl,
      originalName: asset.originalName,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes,
      checksum: asset.checksum,
      uploadedById: asset.uploadedById,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
