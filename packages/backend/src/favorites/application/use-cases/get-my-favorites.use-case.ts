import { Inject, Injectable } from '@nestjs/common';

import { FAVORITE_REPOSITORY } from '../../favorites.tokens';
import type {
  FavoriteConcertReadModel,
  FavoriteRepositoryPort,
} from '../../domain/ports/favorite-repository.port';

@Injectable()
export class GetMyFavoritesUseCase {
  constructor(
    @Inject(FAVORITE_REPOSITORY)
    private readonly favoriteRepo: FavoriteRepositoryPort,
  ) {}

  async execute(userId: string): Promise<FavoriteConcertReadModel[]> {
    return this.favoriteRepo.listByUser(userId);
  }
}
