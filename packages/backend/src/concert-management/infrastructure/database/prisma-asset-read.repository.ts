import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service';
import type { AssetReadRepositoryPort } from '../../domain/ports/asset-read.port';
import type { ServableAsset } from '../../domain/asset.types';

@Injectable()
export class PrismaAssetReadRepository implements AssetReadRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findServableAsset(id: string): Promise<ServableAsset | null> {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      select: {
        id: true,
        kind: true,
        status: true,
        storageKey: true,
        contentType: true,
      },
    });

    return asset;
  }
}
