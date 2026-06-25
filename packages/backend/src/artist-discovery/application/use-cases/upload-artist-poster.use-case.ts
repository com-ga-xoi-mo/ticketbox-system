import { UploadArtistAssetUseCaseBase } from './upload-artist-asset.use-case.base';
import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ObjectStoragePort } from '../../../platform/storage';

export class UploadArtistPosterUseCase extends UploadArtistAssetUseCaseBase {
  constructor(
    repository: ArtistRepositoryPort,
    storage: ObjectStoragePort,
    maxBytes: number = 5242880,
  ) {
    super(repository, storage, maxBytes, 'ARTIST_POSTER', 'poster');
  }

  protected async updateArtistAsset(artistId: string, assetData: any): Promise<void> {
    // Implementation
  }
}
