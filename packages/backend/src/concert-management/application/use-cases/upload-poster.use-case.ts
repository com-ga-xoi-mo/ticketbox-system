import { createHash, randomUUID } from 'node:crypto';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { ObjectStoragePort } from '../../../platform/storage';
import type { PosterWriteRepositoryPort } from '../../domain/ports/poster-write.port';
import type { UploadPosterInput, UploadPosterResult } from '../../domain/poster.types';
import type { PosterImageValidator } from '../services/poster-image-validator';

export class UploadPosterUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly storage: ObjectStoragePort,
    private readonly posterWriteRepo: PosterWriteRepositoryPort,
    private readonly config: PlatformConfigService,
    private readonly posterImageValidator: PosterImageValidator,
  ) {}

  async execute(input: UploadPosterInput): Promise<UploadPosterResult> {
    await this.authorizeConcertManagement.execute({
      actor: {
        userId: input.userId,
        roles: [input.allowAdminOverride ? Role.ADMIN : Role.ORGANIZER],
      },
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });

    const validated = this.posterImageValidator.validate(input, this.config.posterImageMaxBytes);
    const assetId = randomUUID();
    const storageKey = `posters/${input.concertId}/${assetId}.${validated.extension}`;
    const publicUrl = this.storage.getPublicUrl(storageKey);
    const checksum = `sha256:${createHash('sha256').update(input.fileBuffer).digest('hex')}`;

    await this.storage.putObject({
      key: storageKey,
      content: input.fileBuffer,
      contentType: validated.contentType,
    });

    try {
      return await this.posterWriteRepo.createAssetAndAssociateConcertPoster(
        {
          id: assetId,
          storageKey,
          publicUrl,
          originalName: input.originalName,
          contentType: validated.contentType,
          sizeBytes: input.sizeBytes,
          checksum,
          uploadedById: input.userId,
        },
        input.concertId,
      );
    } catch (err) {
      await this.storage.deleteObject(storageKey).catch(() => undefined);
      throw err;
    }
  }
}
