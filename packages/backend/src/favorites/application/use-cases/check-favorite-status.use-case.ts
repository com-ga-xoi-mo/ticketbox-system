import { Inject, Injectable } from '@nestjs/common';

import { FAVORITE_REPOSITORY } from '../../favorites.tokens';
import type { FavoriteRepositoryPort } from '../../domain/ports/favorite-repository.port';

@Injectable()
export class CheckFavoriteStatusUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepositoryPort,
  ) {}

  async execute(userId: string, concertId: string): Promise<{ isFavorited: boolean }> {
    const isFavorited = await this.favoriteRepo.isFavorited(userId, concertId);
    return { isFavorited };
  }
}
