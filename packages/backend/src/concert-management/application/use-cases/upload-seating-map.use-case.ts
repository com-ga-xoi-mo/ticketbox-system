import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { ObjectStoragePort } from '../../../platform/storage';
import type { SeatingMapWriteRepositoryPort } from '../../domain/ports/seating-map-write.port';
import {
  InvalidSeatingMapContentTypeError,
  InvalidSeatingMapExtensionError,
  MissingSeatingMapFileError,
  SeatingMapFileTooLargeError,
  UnsafeSeatingMapSvgError,
} from '../../domain/seating-map.errors';
import type { UploadSeatingMapInput, UploadSeatingMapResult } from '../../domain/seating-map.types';
import type { SvgSafetyValidator } from '../services/svg-safety-validator';

const SVG_CONTENT_TYPE = 'image/svg+xml';

export class UploadSeatingMapUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly storage: ObjectStoragePort,
    private readonly seatingMapWriteRepo: SeatingMapWriteRepositoryPort,
    private readonly config: PlatformConfigService,
    private readonly svgSafetyValidator: SvgSafetyValidator,
  ) {}

  async execute(input: UploadSeatingMapInput): Promise<UploadSeatingMapResult> {
    await this.authorizeConcertManagement.execute({
      actor: {
        userId: input.userId,
        roles: [input.allowAdminOverride ? Role.ADMIN : Role.ORGANIZER],
      },
      concertId: input.concertId,
      allowAdminOverride: input.allowAdminOverride,
    });

    this.validateFileMetadata(input);

    const safety = this.svgSafetyValidator.validate(input.fileBuffer);
    if (!safety.safe) {
      throw new UnsafeSeatingMapSvgError(safety.reasons);
    }

    const assetId = randomUUID();
    const storageKey = `seating-maps/${input.concertId}/${assetId}.svg`;
    const publicUrl = this.storage.getPublicUrl(storageKey);
    const checksum = `sha256:${createHash('sha256').update(input.fileBuffer).digest('hex')}`;

    await this.storage.putObject({
      key: storageKey,
      content: input.fileBuffer,
      contentType: SVG_CONTENT_TYPE,
    });

    try {
      return await this.seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap(
        {
          id: assetId,
          storageKey,
          publicUrl,
          originalName: input.originalName,
          contentType: SVG_CONTENT_TYPE,
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

  private validateFileMetadata(input: UploadSeatingMapInput): void {
    if (!input.fileBuffer || input.fileBuffer.length === 0) {
      throw new MissingSeatingMapFileError();
    }

    if (input.mimeType !== SVG_CONTENT_TYPE) {
      throw new InvalidSeatingMapContentTypeError(input.mimeType);
    }

    if (extname(input.originalName).toLowerCase() !== '.svg') {
      throw new InvalidSeatingMapExtensionError(input.originalName);
    }

    const maxBytes = this.config.seatingMapSvgMaxBytes;
    if (input.sizeBytes > maxBytes || input.fileBuffer.length > maxBytes) {
      throw new SeatingMapFileTooLargeError(input.sizeBytes, maxBytes);
    }
  }
}
