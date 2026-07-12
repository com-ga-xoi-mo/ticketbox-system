import { BadRequestException, Body, Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { HideConcertReviewRequestSchema } from '@ticketbox/api-types';

import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { RateLimited } from '../../../platform/rate-limiting/rate-limit.decorator';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';
import { HideConcertReviewUseCase } from '../../application/use-cases/concert-review.use-cases';
import { mapConcertReviewError } from './concert-review-error.mapper';
import { presentConcertReview } from './concert-review.presenter';

@Controller('admin/concerts/:concertId/reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminConcertReviewController {
  constructor(private readonly hideReview: HideConcertReviewUseCase) {}

  @Patch(':reviewId/hide')
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async hide(
    @Param('concertId') concertId: string,
    @Param('reviewId') reviewId: string,
    @Body() body: unknown,
    @Req() req: { user: AuthenticatedUser },
  ) {
    try {
      const parsed = HideConcertReviewRequestSchema.parse(body || {});
      const review = await this.hideReview.execute(
        concertId,
        reviewId,
        req.user.id,
        parsed.reason,
      );
      return presentConcertReview(review);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        throw new BadRequestException('Invalid hide review payload', { cause: err });
      }
      mapConcertReviewError(err);
    }
  }
}
