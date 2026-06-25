import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { PaginatedArtists } from '../../domain/ports/artist-repository.port';

export interface ListArtistsCommand {
  query?: string;
  limit: number;
  offset: number;
}

export class ListArtistsUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(command: ListArtistsCommand): Promise<PaginatedArtists> {
    return this.repository.findActive({
      query: command.query,
      limit: command.limit,
      offset: command.offset,
    });
  }
}
