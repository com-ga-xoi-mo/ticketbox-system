import { Logger } from '@nestjs/common';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { UploadArtistAssetCommand, UploadArtistAssetResult } from '../use-cases/upload-artist-asset.use-case.base';
import type { UploadArtistAvatarUseCase } from '../use-cases/upload-artist-avatar.use-case';
import type { UploadArtistPosterUseCase } from '../use-cases/upload-artist-poster.use-case';
import type { SetConcertArtistsUseCase, SetConcertArtistsCommand } from '../use-cases/set-concert-artists.use-case';
import type { UpdateArtistUseCase, UpdateArtistCommand } from '../use-cases/update-artist.use-case';
import { invalidateArtistAndConcertCache } from './invalidate-artist-cache';

export class InvalidatingSetConcertArtistsUseCase {
  private readonly logger = new Logger(InvalidatingSetConcertArtistsUseCase.name);

  constructor(
    private readonly inner: SetConcertArtistsUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: SetConcertArtistsCommand): Promise<void> {
    const result = await this.inner.execute(cmd);
    await invalidateArtistAndConcertCache(this.cache, this.logger);
    return result;
  }
}

export class InvalidatingUpdateArtistUseCase {
  private readonly logger = new Logger(InvalidatingUpdateArtistUseCase.name);

  constructor(
    private readonly inner: UpdateArtistUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: UpdateArtistCommand) {
    const result = await this.inner.execute(cmd);
    await invalidateArtistAndConcertCache(this.cache, this.logger);
    return result;
  }
}

export class InvalidatingUploadArtistAvatarUseCase {
  private readonly logger = new Logger(InvalidatingUploadArtistAvatarUseCase.name);

  constructor(
    private readonly inner: UploadArtistAvatarUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: UploadArtistAssetCommand): Promise<UploadArtistAssetResult> {
    const result = await this.inner.execute(cmd);
    await invalidateArtistAndConcertCache(this.cache, this.logger);
    return result;
  }
}

export class InvalidatingUploadArtistPosterUseCase {
  private readonly logger = new Logger(InvalidatingUploadArtistPosterUseCase.name);

  constructor(
    private readonly inner: UploadArtistPosterUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: UploadArtistAssetCommand): Promise<UploadArtistAssetResult> {
    const result = await this.inner.execute(cmd);
    await invalidateArtistAndConcertCache(this.cache, this.logger);
    return result;
  }
}
