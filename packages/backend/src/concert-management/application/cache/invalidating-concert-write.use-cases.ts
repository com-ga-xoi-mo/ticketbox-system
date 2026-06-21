import type { Concert } from '../../domain/concert.types';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { CreateConcertUseCase } from '../use-cases/create-concert.use-case';
import type { UpdateConcertUseCase } from '../use-cases/update-concert.use-case';
import type { PublishConcertUseCase } from '../use-cases/publish-concert.use-case';
import type { CancelConcertUseCase } from '../use-cases/cancel-concert.use-case';
import type {
  CreateConcertCommand,
  UpdateConcertCommand,
  PublishConcertCommand,
  CancelConcertCommand,
} from '../use-cases/commands';
import { invalidateConcertCatalogCache } from './invalidate-concert-catalog-cache';

/**
 * Invalidating decorator for `CreateConcertUseCase`.
 * Flushes the concert catalog cache after a successful create.
 */
export class InvalidatingCreateConcertUseCase {
  constructor(
    private readonly inner: CreateConcertUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: CreateConcertCommand): Promise<Concert> {
    const result = await this.inner.execute(cmd);
    await invalidateConcertCatalogCache(this.cache);
    return result;
  }
}

/**
 * Invalidating decorator for `UpdateConcertUseCase`.
 * Flushes the concert catalog cache after a successful update.
 * Note: update can change the slug, so a per-slug delete is insufficient —
 * a full prefix flush is the correct approach (see design Decision 7).
 */
export class InvalidatingUpdateConcertUseCase {
  constructor(
    private readonly inner: UpdateConcertUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: UpdateConcertCommand): Promise<Concert> {
    const result = await this.inner.execute(cmd);
    await invalidateConcertCatalogCache(this.cache);
    return result;
  }
}

/**
 * Invalidating decorator for `PublishConcertUseCase`.
 * Flushes the concert catalog cache after a successful publish.
 */
export class InvalidatingPublishConcertUseCase {
  constructor(
    private readonly inner: PublishConcertUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: PublishConcertCommand): Promise<Concert> {
    const result = await this.inner.execute(cmd);
    await invalidateConcertCatalogCache(this.cache);
    return result;
  }
}

/**
 * Invalidating decorator for `CancelConcertUseCase`.
 * Flushes the concert catalog cache after a successful cancel.
 */
export class InvalidatingCancelConcertUseCase {
  constructor(
    private readonly inner: CancelConcertUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: CancelConcertCommand): Promise<Concert> {
    const result = await this.inner.execute(cmd);
    await invalidateConcertCatalogCache(this.cache);
    return result;
  }
}
