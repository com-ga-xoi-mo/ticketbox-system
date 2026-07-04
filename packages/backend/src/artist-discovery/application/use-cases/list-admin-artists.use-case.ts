import { Inject, Injectable } from '@nestjs/common';
import { ARTIST_REPOSITORY, ArtistRepositoryPort, FindAdminArtistsParams } from '../../domain/ports/artist-repository.port';

@Injectable()
export class ListAdminArtistsUseCase {
  constructor(
    @Inject(ARTIST_REPOSITORY)
    private readonly artistRepo: ArtistRepositoryPort,
  ) {}

  async execute(params: FindAdminArtistsParams) {
    return this.artistRepo.findAdminArtists(params);
  }
}
