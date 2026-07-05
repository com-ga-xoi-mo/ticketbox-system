import { Inject, Injectable } from '@nestjs/common';

import { FAVORITE_REPOSITORY } from '../../favorites.tokens';
import type { FavoriteRepositoryPort } from '../../domain/ports/favorite-repository.port';

@Injectable()
export class ToggleFavoriteUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepositoryPort,
  ) {}

  async execute(userId: string, concertId: string): Promise<{ isFavorited: boolean }> {
    return this.favoriteRepo.toggleFavorite(userId, concertId);
  }
}
