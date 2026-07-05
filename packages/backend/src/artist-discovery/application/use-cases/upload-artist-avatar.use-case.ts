import { UploadArtistAssetUseCaseBase } from './upload-artist-asset.use-case.base';
import { ArtistRepositoryPort } from '../../domain/ports/artist-repository.port';
import { ObjectStoragePort } from '../../../platform/storage';
import { PlatformConfigService } from '../../../platform/config/platform-config.service';

export class UploadArtistAvatarUseCase extends UploadArtistAssetUseCaseBase {
  constructor(
    repository: ArtistRepositoryPort,
    storage: ObjectStoragePort,
    config: PlatformConfigService,
  ) {
    super(repository, storage, config, 'ARTIST_AVATAR', 'avatar');
  }

  protected async updateArtistAsset(artistId: string, assetData: any): Promise<{ replacedStorageKey?: string }> {
    return this.repository.createAssetAndLinkAvatar(artistId, assetData);
  }
}
