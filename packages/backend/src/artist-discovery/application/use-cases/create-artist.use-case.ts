import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistRecord, ArtistStatus } from '../../domain/artist.types';
import { ArtistSlugInvalidError, ArtistSlugConflictError } from '../../domain/errors';

export interface CreateArtistCommand {
  slug: string;
  displayName: string;
  bio?: string;
  status?: ArtistStatus;
}

export class CreateArtistUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(command: CreateArtistCommand): Promise<ArtistRecord> {
    if (!/^[a-z0-9-_]+$/.test(command.slug)) {
      throw new ArtistSlugInvalidError(command.slug);
    }

    const existing = await this.repository.findBySlug(command.slug);
    if (existing) {
      throw new ArtistSlugConflictError(command.slug);
    }

    return this.repository.create({
      slug: command.slug,
      displayName: command.displayName,
      bio: command.bio ?? null,
      avatarAssetId: null,
      posterAssetId: null,
      status: command.status ?? ArtistStatus.ACTIVE,
    });
  }
}
