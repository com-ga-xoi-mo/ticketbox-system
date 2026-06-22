import { Injectable } from '@nestjs/common';
import { AssetKind, AssetStatus, type Asset } from '@prisma/client';

import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  CreateSeatingMapAssetData,
  SeatingMapWriteRepositoryPort,
} from '../../domain/ports/seating-map-write.port';
import type { SeatingMapAsset } from '../../domain/seating-map.types';

@Injectable()
export class PrismaSeatingMapWriteRepository implements SeatingMapWriteRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createAssetAndAssociateConcertSeatingMap(
    assetData: CreateSeatingMapAssetData,
    concertId: string,
    oldAssetId?: string,
  ): Promise<{
    asset: SeatingMapAsset;
    concert: { id: string; seatingMapAssetId: string };
    replacedStorageKey: string | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const concert = await tx.concert.findUnique({
        where: { id: concertId },
        select: { id: true, seatingMapAssetId: true },
      });
      const currentAssetId = oldAssetId ?? concert?.seatingMapAssetId ?? undefined;

      const asset = await tx.asset.create({
        data: {
          id: assetData.id,
          kind: AssetKind.SEATING_MAP,
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
        data: { seatingMapAssetId: asset.id },
        select: { id: true, seatingMapAssetId: true },
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
          seatingMapAssetId: updatedConcert.seatingMapAssetId ?? asset.id,
        },
        replacedStorageKey,
      };
    });
  }

  async findAssetById(id: string): Promise<SeatingMapAsset | null> {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    return asset ? this.toDomain(asset) : null;
  }

  private toDomain(asset: Asset): SeatingMapAsset {
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
