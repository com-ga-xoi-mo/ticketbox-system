import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistRecord } from '../../domain/artist.types';

export class GetTopArtistsUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(limit: number = 10): Promise<ArtistRecord[]> {
    return this.repository.findTopByFavorites(limit);
  }
}
