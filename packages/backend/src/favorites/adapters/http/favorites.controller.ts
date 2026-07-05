import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { ToggleFavoriteUseCase } from '../../application/use-cases/toggle-favorite.use-case';
import { GetMyFavoritesUseCase } from '../../application/use-cases/get-my-favorites.use-case';
import { CheckFavoriteStatusUseCase } from '../../application/use-cases/check-favorite-status.use-case';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUDIENCE)
export class FavoritesController {
  constructor(
    private readonly toggleFavoriteUseCase: ToggleFavoriteUseCase,
    private readonly getMyFavoritesUseCase: GetMyFavoritesUseCase,
    private readonly checkFavoriteStatusUseCase: CheckFavoriteStatusUseCase,
  ) {}

  @Get('me/favorites')
  async getMyFavorites(@Request() req: { user: AuthenticatedUser }) {
    return this.getMyFavoritesUseCase.execute(req.user.id);
  }

  @Post('me/favorites/:concertId')
  @HttpCode(HttpStatus.OK)
  async toggleFavorite(
    @Request() req: { user: AuthenticatedUser },
    @Param('concertId') concertId: string,
  ) {
    try {
      return await this.toggleFavoriteUseCase.execute(req.user.id, concertId);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) throw err;
      throw err;
    }
  }

  @Get('me/favorites/:concertId/status')
  async checkFavoriteStatus(
    @Request() req: { user: AuthenticatedUser },
    @Param('concertId') concertId: string,
  ) {
    return this.checkFavoriteStatusUseCase.execute(req.user.id, concertId);
  }
}
