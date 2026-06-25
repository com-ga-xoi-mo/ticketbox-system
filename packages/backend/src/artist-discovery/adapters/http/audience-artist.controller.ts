import { Controller, Post, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { FollowArtistUseCase } from '../../application/use-cases/follow-artist.use-case';
import { UnfollowArtistUseCase } from '../../application/use-cases/unfollow-artist.use-case';
import { FavoriteArtistUseCase } from '../../application/use-cases/favorite-artist.use-case';
import { UnfavoriteArtistUseCase } from '../../application/use-cases/unfavorite-artist.use-case';

@Controller('audience/artists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUDIENCE)
export class AudienceArtistController {
  constructor(
    private readonly followArtist: FollowArtistUseCase,
    private readonly unfollowArtist: UnfollowArtistUseCase,
    private readonly favoriteArtist: FavoriteArtistUseCase,
    private readonly unfavoriteArtist: UnfavoriteArtistUseCase,
  ) {}

  @Post(':id/follow')
  async follow(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    await this.followArtist.execute(userId, id);
    return { artistId: id, following: true };
  }

  @Delete(':id/follow')
  async unfollow(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    await this.unfollowArtist.execute(userId, id);
    return { artistId: id, following: false };
  }

  @Post(':id/favorite')
  async favorite(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    await this.favoriteArtist.execute(userId, id);
    return { artistId: id, favorited: true };
  }

  @Delete(':id/favorite')
  async unfavorite(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).id;
    await this.unfavoriteArtist.execute(userId, id);
    return { artistId: id, favorited: false };
  }
}
