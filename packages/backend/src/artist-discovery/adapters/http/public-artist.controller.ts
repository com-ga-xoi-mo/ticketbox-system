import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtAuthGuard } from '../../../identity/infrastructure/passport/optional-jwt-auth.guard';
import { ListArtistsUseCase } from '../../application/use-cases/list-artists.use-case';
import { GetArtistProfileUseCase } from '../../application/use-cases/get-artist-profile.use-case';
import { GetTopArtistsUseCase } from '../../application/use-cases/get-top-artists.use-case';

@Controller('public/artists')
export class PublicArtistController {
  constructor(
    private readonly listArtists: ListArtistsUseCase,
    private readonly getProfile: GetArtistProfileUseCase,
    private readonly getTopArtists: GetTopArtistsUseCase,
  ) {}

  @Get()
  async list(@Query('q') q?: string, @Query('limit') limit = 20, @Query('offset') offset = 0) {
    return this.listArtists.execute({ query: q, limit: Number(limit), offset: Number(offset) });
  }

  @Get('top')
  async top(@Query('limit') limit = 10) {
    return this.getTopArtists.execute(Number(limit));
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  async profile(@Param('slug') slug: string, @Req() req: Request) {
    const userId = (req.user as any)?.id;
    return this.getProfile.execute({ slug, userId });
  }
}
