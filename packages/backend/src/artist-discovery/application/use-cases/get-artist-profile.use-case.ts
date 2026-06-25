import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistNotFoundError } from '../../domain/errors';

export interface GetArtistProfileCommand {
  slug: string;
  userId?: string;
}

export class GetArtistProfileUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(command: GetArtistProfileCommand): Promise<any> {
    const artist = await this.repository.findBySlug(command.slug);
    if (!artist) {
      throw new ArtistNotFoundError(command.slug);
    }

    const upcomingEvents = await this.repository.findUpcomingEventsByArtist(artist.id);
    const pastEventCount = await this.repository.countPastEventsByArtist(artist.id);

    let viewerFollowing = null;
    let viewerFavorited = null;

    if (command.userId) {
      const follow = await this.repository.findFollow(command.userId, artist.id);
      viewerFollowing = !!follow;

      const favorite = await this.repository.findFavorite(command.userId, artist.id);
      viewerFavorited = !!favorite;
    }

    return {
      ...artist,
      upcomingEvents,
      pastEventCount,
      viewerFollowing,
      viewerFavorited,
    };
  }
}
