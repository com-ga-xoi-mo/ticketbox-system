import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { LocationSearchQuerySchema } from '@ticketbox/api-types';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { SearchLocationsUseCase } from '../../application/search-locations.use-case';
import { GeocodingProviderUnavailableError } from '../../domain/errors';
import {
  RateLimitExceededError,
  RateLimitStoreUnavailableError,
} from '../../../platform/rate-limiting/rate-limit.errors';

/**
 * GET /locations/search?q=<query>
 *
 * Accessible to ADMIN and ORGANIZER only (requires JWT + role guard).
 * Rate limiting is handled INSIDE SearchLocationsUseCase (after cache lookup),
 * NOT via the @RateLimit interceptor — intentionally excluded here.
 */
@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.ORGANIZER)
export class LocationsController {
  constructor(private readonly searchLocationsUseCase: SearchLocationsUseCase) {}

  @Get('search')
  async search(
    @Query() rawQuery: Record<string, unknown>,
    @Res({ passthrough: true }) res: Response,
  ) {
    let dto: { q: string };
    try {
      dto = LocationSearchQuerySchema.parse(rawQuery);
    } catch (err: any) {
      throw new BadRequestException('Invalid query parameters', { cause: err });
    }

    try {
      const results = await this.searchLocationsUseCase.execute(dto.q);
      return { results };
    } catch (err: unknown) {
      if (err instanceof RateLimitExceededError) {
        res.setHeader('Retry-After', String(err.retryAfterSeconds));
        throw new HttpException(
          {
            message: 'Geocoding rate limit exceeded. Please wait before searching again.',
            error: 'Too Many Requests',
            statusCode: 429,
            retryAfterSeconds: err.retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (
        err instanceof RateLimitStoreUnavailableError ||
        err instanceof GeocodingProviderUnavailableError
      ) {
        throw new ServiceUnavailableException(
          'Location search is temporarily unavailable. Please try again later.',
        );
      }

      throw err;
    }
  }
}
