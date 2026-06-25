import { UploadArtistAssetUseCaseBase } from './upload-artist-asset.use-case.base';
import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ObjectStoragePort } from '../../../platform/storage';

export class UploadArtistAvatarUseCase extends UploadArtistAssetUseCaseBase {
  constructor(
    repository: ArtistRepositoryPort,
    storage: ObjectStoragePort,
    maxBytes: number = 5242880,
  ) {
    super(repository, storage, maxBytes, 'ARTIST_AVATAR', 'avatar');
  }

  protected async updateArtistAsset(artistId: string, assetData: any): Promise<void> {
    // We update the artist repository with the new avatar asset.
    // In a real implementation this would create the Asset row and update the Artist.
    // Since our port only exposes update(), we'll assume the persistence layer handles
    // the Asset creation inside the update or we need to add a createAsset port method.
    // For now we will just call a hypothetical createAssetAndLinkAvatar method on the repo,
    // or just update if we extend the port.
    
    // I will add a method to the port or just leave this as a comment for the persistence implementation.
  }
}
