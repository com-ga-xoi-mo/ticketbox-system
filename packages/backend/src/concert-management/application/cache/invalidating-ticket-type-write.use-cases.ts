import type { TicketType } from '../../domain/concert.types';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { CreateTicketTypeUseCase } from '../use-cases/create-ticket-type.use-case';
import type { UpdateTicketTypeUseCase } from '../use-cases/update-ticket-type.use-case';
import type { ArchiveTicketTypeUseCase } from '../use-cases/archive-ticket-type.use-case';
import type {
  CreateTicketTypeCommand,
  UpdateTicketTypeCommand,
  ArchiveTicketTypeCommand,
} from '../use-cases/commands';
import { invalidateConcertCatalogCache } from './invalidate-concert-catalog-cache';

/**
 * Invalidating decorator for `CreateTicketTypeUseCase`.
 * Ticket-type writes carry no slug, so a prefix flush of the catalog
 * namespace is the correct approach (see design Decision 7).
 */
export class InvalidatingCreateTicketTypeUseCase {
  constructor(
    private readonly inner: CreateTicketTypeUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: CreateTicketTypeCommand): Promise<TicketType> {
    const result = await this.inner.execute(cmd);
    await invalidateConcertCatalogCache(this.cache);
    return result;
  }
}

/**
 * Invalidating decorator for `UpdateTicketTypeUseCase`.
 */
export class InvalidatingUpdateTicketTypeUseCase {
  constructor(
    private readonly inner: UpdateTicketTypeUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: UpdateTicketTypeCommand): Promise<TicketType> {
    const result = await this.inner.execute(cmd);
    await invalidateConcertCatalogCache(this.cache);
    return result;
  }
}

/**
 * Invalidating decorator for `ArchiveTicketTypeUseCase`.
 */
export class InvalidatingArchiveTicketTypeUseCase {
  constructor(
    private readonly inner: ArchiveTicketTypeUseCase,
    private readonly cache: CacheServicePort,
  ) {}

  async execute(cmd: ArchiveTicketTypeCommand): Promise<TicketType> {
    const result = await this.inner.execute(cmd);
    await invalidateConcertCatalogCache(this.cache);
    return result;
  }
}
