import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';

import {
  RateLimitExceededError,
  RateLimitStoreUnavailableError,
} from './rate-limit.errors';
import { RATE_LIMIT_POLICY_KEY } from './rate-limit.decorator';
import type { RateLimitPolicy } from './rate-limit-policy';
import { RateLimitActorKeyService } from './rate-limit-actor-key.service';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly actorKeyService: RateLimitActorKeyService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const policy = this.reflector.getAllAndOverride<RateLimitPolicy>(RATE_LIMIT_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!policy) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<{
      setHeader(name: string, value: string): void;
    }>();
    const request = context.switchToHttp().getRequest();
    const actorKey = this.actorKeyService.derive(policy, request);

    try {
      await this.rateLimitService.consume(policy, actorKey);
    } catch (err: unknown) {
      if (err instanceof RateLimitExceededError) {
        response.setHeader('Retry-After', String(err.retryAfterSeconds));
        throw new HttpException(
          {
            message: err.message,
            error: 'Too Many Requests',
            statusCode: 429,
            retryAfterSeconds: err.retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (err instanceof RateLimitStoreUnavailableError) {
        throw new ServiceUnavailableException(err.message);
      }

      throw err;
    }

    return next.handle();
  }
}
