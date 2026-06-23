import type { ConcertAvailabilitySnapshot, ConcertDetail } from '../../domain/catalog.types';
import type { CacheServicePort } from '../../../platform/cache/cache.tokens';
import type { GetConcertAvailabilityUseCase } from '../use-cases/get-concert-availability.use-case';
import type { GetPublicConcertDetailUseCase } from '../use-cases/get-public-concert-detail.use-case';
import { ConcertCacheKeys } from './concert-cache-keys';

const TTL_SECONDS = 60;

/**
 * Decorator for `GetPublicConcertDetailUseCase`.
 * Key: `ticketbox:cache:concert:detail:{slug}`, TTL 60s.
 *
 * Exceptions (e.g. `PublicConcertNotFoundError`) propagate unchanged and are
 * NOT cached (fail-open is for Redis errors only).
 */
export class CachingGetPublicConcertDetailUseCase {
  constructor(
    private readonly inner: GetPublicConcertDetailUseCase,
    private readonly cache: CacheServicePort,
    private readonly getAvailability: Pick<GetConcertAvailabilityUseCase, 'execute'>,
  ) {}

  async execute(slug: string, now = new Date()): Promise<ConcertDetail> {
    const staticDetail = await this.cache.getOrSet(ConcertCacheKeys.detail(slug), TTL_SECONDS, () =>
      this.inner.execute(slug, now),
    );

    const availability = await this.getAvailability.execute(slug, now);
    return composeDetailAvailability(staticDetail, availability);
  }
}

function composeDetailAvailability(
  detail: ConcertDetail,
  availability: ConcertAvailabilitySnapshot,
): ConcertDetail {
  const availabilityByTicketTypeId = new Map(
    availability.ticketTypes.map((ticketType) => [ticketType.ticketTypeId, ticketType]),
  );

  return {
    ...detail,
    ticketTypes: detail.ticketTypes.map((ticketType) => {
      const availabilityTicketType = availabilityByTicketTypeId.get(ticketType.id);
      if (!availabilityTicketType) return ticketType;

      return {
        ...ticketType,
        availableQuantity: availabilityTicketType.availableQuantity,
      };
    }),
  };
}
