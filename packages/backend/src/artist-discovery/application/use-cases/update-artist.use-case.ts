import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistRecord, ArtistStatus } from '../../domain/artist.types';
import { ArtistNotFoundError, ArtistSlugInvalidError, ArtistSlugConflictError } from '../../domain/errors';

export interface UpdateArtistCommand {
  id: string;
  slug?: string;
  displayName?: string;
  bio?: string | null;
  status?: ArtistStatus;
}

export class UpdateArtistUseCase {
  constructor(private readonly repository: ArtistRepositoryPort) {}

  async execute(command: UpdateArtistCommand): Promise<ArtistRecord> {
    const existing = await this.repository.findById(command.id);
    if (!existing) {
      throw new ArtistNotFoundError(command.id);
    }

    if (command.slug && command.slug !== existing.slug) {
      if (!/^[a-z0-9-_]+$/.test(command.slug)) {
        throw new ArtistSlugInvalidError(command.slug);
      }
      const existingSlug = await this.repository.findBySlug(command.slug);
      if (existingSlug && existingSlug.id !== command.id) {
        throw new ArtistSlugConflictError(command.slug);
      }
    }

    return this.repository.update(command.id, {
      slug: command.slug,
      displayName: command.displayName,
      bio: command.bio,
      status: command.status,
    });
  }
}
