import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';

export class UnfollowArtistUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(userId: string, artistId: string): Promise<void> {
    const existing = await this.repository.findFollow(userId, artistId);
    if (existing) {
      await this.repository.deleteFollow(userId, artistId);
      await this.repository.decrementFollowerCount(artistId);
    }
  }
}
