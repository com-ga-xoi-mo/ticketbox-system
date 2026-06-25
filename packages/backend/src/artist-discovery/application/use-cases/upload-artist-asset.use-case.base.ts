import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ArtistNotFoundError } from '../../domain/errors';
import { ObjectStoragePort } from '../../../platform/storage';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { extname } from 'path';

export interface UploadArtistAssetCommand {
  artistId: string;
  originalName: string;
  contentType: string;
  content: Buffer;
  uploadedById: string;
}

export abstract class UploadArtistAssetUseCaseBase {
  constructor(
    protected readonly repository: ArtistRepositoryPort,
    protected readonly storage: ObjectStoragePort,
    protected readonly maxBytes: number,
    protected readonly assetKind: string,
    protected readonly storagePrefix: string,
  ) {}

  async execute(command: UploadArtistAssetCommand): Promise<void> {
    const artist = await this.repository.findById(command.artistId);
    if (!artist) {
      throw new ArtistNotFoundError(command.artistId);
    }

    if (command.content.length > this.maxBytes) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxBytes} bytes`);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(command.contentType)) {
      throw new Error('Invalid file type');
    }

    const assetId = randomUUID();
    const ext = extname(command.originalName) || '.jpg';
    const storageKey = `artists/${command.artistId}/${this.storagePrefix}/${assetId}${ext}`;
    const checksum = createHash('sha256').update(command.content).digest('hex');

    await this.storage.putObject({
      key: storageKey,
      content: command.content,
      contentType: command.contentType,
    });

    // In a full implementation, we would create the Asset record in the database
    // and update the Artist record. For this spec, we will delegate the asset creation
    // to the repository port.
    await this.updateArtistAsset(command.artistId, {
      id: assetId,
      storageKey,
      originalName: command.originalName,
      contentType: command.contentType,
      sizeBytes: command.content.length,
      checksum,
      uploadedById: command.uploadedById,
    });
  }

  protected abstract updateArtistAsset(artistId: string, assetData: any): Promise<void>;
}
