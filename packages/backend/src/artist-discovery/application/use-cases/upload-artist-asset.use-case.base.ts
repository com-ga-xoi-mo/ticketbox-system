import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistNotFoundError } from '../../domain/errors';
import { ObjectStoragePort } from '../../../platform/storage';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { extname } from 'path';
import { PosterImageValidator } from '../../../concert-management/application/services/poster-image-validator';
import { PlatformConfigService } from '../../../platform/config/platform-config.service';

export interface UploadArtistAssetCommand {
  artistId: string;
  originalName: string;
  contentType: string;
  content: Buffer;
  uploadedById: string;
}

export interface UploadArtistAssetResult {
  id: string;
  publicUrl: string;
}

export abstract class UploadArtistAssetUseCaseBase {
  protected readonly validator = new PosterImageValidator();

  constructor(
    protected readonly repository: ArtistRepositoryPort,
    protected readonly storage: ObjectStoragePort,
    protected readonly config: PlatformConfigService,
    protected readonly assetKind: string,
    protected readonly storagePrefix: string,
  ) {}

  async execute(command: UploadArtistAssetCommand): Promise<UploadArtistAssetResult> {
    const artist = await this.repository.findById(command.artistId);
    if (!artist) {
      throw new ArtistNotFoundError(command.artistId);
    }

    const maxBytes = this.assetKind === 'ARTIST_AVATAR' ? this.config.posterImageMaxBytes ?? 5242880 : this.config.posterImageMaxBytes ?? 5242880;

    const validated = this.validator.validate(
      {
        concertId: command.artistId, // reusing the type
        userId: command.uploadedById,
        fileBuffer: command.content,
        mimeType: command.contentType,
        originalName: command.originalName,
        sizeBytes: command.content.length,
        allowAdminOverride: true,
      },
      maxBytes,
    );

    const assetId = randomUUID();
    const storageKey = `artists/${command.artistId}/${this.storagePrefix}/${assetId}.${validated.extension}`;
    const publicUrl = this.storage.getPublicUrl(storageKey);
    const checksum = `sha256:${createHash('sha256').update(command.content).digest('hex')}`;

    await this.storage.putObject({
      key: storageKey,
      content: command.content,
      contentType: validated.contentType,
    });

    let result;
    try {
      result = await this.updateArtistAsset(command.artistId, {
        id: assetId,
        storageKey,
        publicUrl,
        originalName: command.originalName,
        contentType: validated.contentType,
        sizeBytes: command.content.length,
        checksum,
        uploadedById: command.uploadedById,
      });
    } catch (err) {
      await this.storage.deleteObject(storageKey).catch(() => undefined);
      throw err;
    }

    if (result && result.replacedStorageKey) {
      await this.storage.deleteObject(result.replacedStorageKey).catch(() => undefined);
    }

    return { id: assetId, publicUrl };
  }

  protected abstract updateArtistAsset(artistId: string, assetData: any): Promise<{ replacedStorageKey?: string }>;
}
