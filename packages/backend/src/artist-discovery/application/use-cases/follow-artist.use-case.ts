import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistNotFoundError } from '../../domain/errors';

export class FollowArtistUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(userId: string, artistId: string): Promise<void> {
    const artist = await this.repository.findById(artistId);
    if (!artist) {
      throw new ArtistNotFoundError(artistId);
    }

    const existing = await this.repository.findFollow(userId, artistId);
    if (!existing) {
      await this.repository.createFollow(userId, artistId);
      await this.repository.incrementFollowerCount(artistId);
    }
  }
}
