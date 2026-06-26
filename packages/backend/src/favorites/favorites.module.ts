import { Module } from '@nestjs/common';

import { DatabaseModule } from '../platform/database/database.module';
import { CheckFavoriteStatusUseCase } from './application/use-cases/check-favorite-status.use-case';
import { GetMyFavoritesUseCase } from './application/use-cases/get-my-favorites.use-case';
import { ToggleFavoriteUseCase } from './application/use-cases/toggle-favorite.use-case';
import { FavoritesController } from './adapters/http/favorites.controller';
import { FAVORITE_REPOSITORY } from './favorites.tokens';
import { PrismaFavoriteRepository } from './infrastructure/database/prisma-favorite-concert.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [FavoritesController],
  providers: [
    {
      provide: FAVORITE_REPOSITORY,
      useClass: PrismaFavoriteRepository,
    },
    ToggleFavoriteUseCase,
    GetMyFavoritesUseCase,
    CheckFavoriteStatusUseCase,
  ],
  exports: [
    ToggleFavoriteUseCase,
    GetMyFavoritesUseCase,
    CheckFavoriteStatusUseCase,
  ],
})
export class FavoritesModule {}
