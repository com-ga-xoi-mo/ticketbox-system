import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import type { Role } from '../../../identity/domain/role.enum';
import {
  buildPressKitStorageKey,
  validatePressKitUpload,
} from '../pdf-validation';
import type {
  ArtistBioActor,
  ArtistBioRecord,
  PressKitUpload,
} from '../../domain/artist-bio.types';
import type { ArtistBioQueuePort } from '../../domain/ports/artist-bio-queue.port';
import type { ArtistBioRepositoryPort } from '../../domain/ports/artist-bio-repository.port';
import type { ObjectStoragePort } from '../../../platform/storage';

export interface RequestArtistBioCommand {
  concertId: string;
  actor: ArtistBioActor;
  upload: PressKitUpload;
  allowAdminOverride: boolean;
}

export class RequestArtistBioUseCase {
  constructor(
    private readonly repository: ArtistBioRepositoryPort,
    private readonly storage: ObjectStoragePort,
    private readonly queue: ArtistBioQueuePort,
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly maxPdfBytes: number,
    private readonly maxAttempts: number,
  ) {}

  async execute(cmd: RequestArtistBioCommand): Promise<ArtistBioRecord> {
    await this.authorizeConcertManagement.execute({
      concertId: cmd.concertId,
      actor: {
        userId: cmd.actor.userId,
        roles: cmd.actor.roles as Role[],
      },
      allowAdminOverride: cmd.allowAdminOverride,
    });

    const validation = validatePressKitUpload(cmd.upload, this.maxPdfBytes);
    const storageKey = buildPressKitStorageKey(cmd.concertId, validation.checksum);

    await this.storage.putObject({
      key: storageKey,
      content: cmd.upload.content,
      contentType: cmd.upload.contentType,
    });

    const asset = await this.repository.createPressKitAsset({
      storageKey,
      originalName: cmd.upload.originalName,
      contentType: cmd.upload.contentType,
      sizeBytes: validation.sizeBytes,
      checksum: validation.checksum,
      uploadedById: cmd.actor.userId,
    });

    const artistBio = await this.repository.createWorkflow({
      concertId: cmd.concertId,
      pressKitAssetId: asset.id,
      requestedById: cmd.actor.userId,
      maxAttempts: this.maxAttempts,
    });

    await this.queue.enqueueRequested(artistBio.id);
    return artistBio;
  }
}
