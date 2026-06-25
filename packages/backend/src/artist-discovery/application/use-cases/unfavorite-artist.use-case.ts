import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';

export class UnfavoriteArtistUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(userId: string, artistId: string): Promise<void> {
    const existing = await this.repository.findFavorite(userId, artistId);
    if (existing) {
      await this.repository.deleteFavorite(userId, artistId);
      await this.repository.decrementFavoriteCount(artistId);
    }
  }
}
