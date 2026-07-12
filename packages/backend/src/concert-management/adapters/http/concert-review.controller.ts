import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CreateConcertReviewRequestSchema,
  UpdateConcertReviewRequestSchema,
} from '@ticketbox/api-types';

import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { RateLimited } from '../../../platform/rate-limiting/rate-limit.decorator';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';
import {
  CreateConcertReviewUseCase,
  DeleteMyConcertReviewUseCase,
  ListConcertReviewsUseCase,
  UpdateMyConcertReviewUseCase,
} from '../../application/use-cases/concert-review.use-cases';
import { mapConcertReviewError } from './concert-review-error.mapper';
import { presentConcertReview } from './concert-review.presenter';

@Controller('concerts/:slug/reviews')
export class ConcertReviewController {
  constructor(
    private readonly listReviews: ListConcertReviewsUseCase,
    private readonly createReview: CreateConcertReviewUseCase,
    private readonly updateMyReview: UpdateMyConcertReviewUseCase,
    private readonly deleteMyReview: DeleteMyConcertReviewUseCase,
  ) {}

  @Get()
  @RateLimited(RateLimitPolicy.BROWSING)
  async list(@Param('slug') slug: string) {
    try {
      const result = await this.listReviews.execute(slug);
      return {
        summary: result.summary,
        reviews: result.reviews.map(presentConcertReview),
      };
    } catch (err) {
      mapConcertReviewError(err);
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  @RateLimited(RateLimitPolicy.CHECKOUT)
  async create(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Req() req: { user: AuthenticatedUser },
  ) {
    try {
      const parsed = CreateConcertReviewRequestSchema.parse(body);
      const review = await this.createReview.execute(slug, req.user.id, parsed);
      return presentConcertReview(review);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        throw new BadRequestException('Invalid review payload', { cause: err });
      }
      mapConcertReviewError(err);
    }
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  @RateLimited(RateLimitPolicy.CHECKOUT)
  async updateMine(
    @Param('slug') slug: string,
    @Body() body: unknown,
    @Req() req: { user: AuthenticatedUser },
  ) {
    try {
      const parsed = UpdateConcertReviewRequestSchema.parse(body);
      const review = await this.updateMyReview.execute(slug, req.user.id, parsed);
      return presentConcertReview(review);
    } catch (err: any) {
      if (err?.name === 'ZodError') {
        throw new BadRequestException('Invalid review payload', { cause: err });
      }
      mapConcertReviewError(err);
    }
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  @RateLimited(RateLimitPolicy.CHECKOUT)
  async deleteMine(@Param('slug') slug: string, @Req() req: { user: AuthenticatedUser }) {
    try {
      return await this.deleteMyReview.execute(slug, req.user.id);
    } catch (err) {
      mapConcertReviewError(err);
    }
  }
}
