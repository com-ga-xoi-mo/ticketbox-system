import { NotFoundException } from '@nestjs/common';
import { AssetNotServableError } from '../../domain/asset.errors';

export async function mapAssetErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    if (err instanceof AssetNotServableError) {
      throw new NotFoundException(err.message);
    }
    throw err;
  }
}
