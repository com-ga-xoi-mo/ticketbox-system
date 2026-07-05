import { Controller, Post, Delete, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { CreateListingUseCase } from '../../application/use-cases/create-listing.use-case';
import { CancelListingUseCase } from '../../application/use-cases/cancel-listing.use-case';
import { GetMyListingsUseCase } from '../../application/use-cases/get-my-listings.use-case';
import { GetFeedUseCase } from '../../application/use-cases/get-feed.use-case';
import { GetListingDetailUseCase } from '../../application/use-cases/get-listing-detail.use-case';
import { JwtAuthGuard } from '../../../identity/auth.module';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { OptionalJwtAuthGuard } from '../../../identity/infrastructure/passport/optional-jwt-auth.guard';

@Controller()
export class ResaleListingsController {
  constructor(
    private readonly createListing: CreateListingUseCase,
    private readonly cancelListing: CancelListingUseCase,
    private readonly getMyListings: GetMyListingsUseCase,
    private readonly getFeed: GetFeedUseCase,
    private readonly getListingDetail: GetListingDetailUseCase
  ) {}

  @Post('resale/listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async createListingAction(@Req() req: any, @Body() body: { ticketId: string; askingPriceVnd: number }) {
    return this.createListing.execute(req.user.id, body.ticketId, body.askingPriceVnd);
  }

  @Delete('resale/listings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async cancelListingAction(@Req() req: any, @Param('id') id: string) {
    return this.cancelListing.execute(req.user.id, id);
  }

  @Get('me/resale/listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async getMyListingsAction(@Req() req: any) {
    return this.getMyListings.execute(req.user.id);
  }

  @Get('resale/listings')
  @UseGuards(OptionalJwtAuthGuard)
  async getFeedAction(
    @Req() req: any,
    @Query('concertId') concertId?: string,
    @Query('sort') sort?: 'trending' | 'newest' | 'price_asc' | 'price_desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const userId = req.user?.id;
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.getFeed.execute({ concertId, sort: sort || 'trending', page: p, limit: l, userId });
  }

  @Get('resale/listings/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getListingAction(@Req() req: any, @Param('id') id: string) {
    return this.getListingDetail.execute(id, req.user?.id);
  }
}
