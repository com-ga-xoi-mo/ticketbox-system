import { SetMetadata } from '@nestjs/common';

import type { RateLimitPolicy } from './rate-limit-policy';

export const RATE_LIMIT_POLICY_KEY = 'ticketbox:rate-limit-policy';

export const RateLimited = (policy: RateLimitPolicy) =>
  SetMetadata(RATE_LIMIT_POLICY_KEY, policy);
