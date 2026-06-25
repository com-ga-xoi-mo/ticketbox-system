import { createHash, randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import type { AuthorizeConcertManagementUseCase } from '../../../identity/application/use-cases/authorize-concert-management.use-case';
import { Role } from '../../../identity/domain/role.enum';
import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { ObjectStoragePort } from '../../../platform/storage';
import type { ConcertWriteRepositoryPort } from '../../domain/ports/concert-write.port';
import type { SeatingMapWriteRepositoryPort } from '../../domain/ports/seating-map-write.port';
import {
  ConcertNotDraftError,
  InvalidSeatingMapContentTypeError,
  InvalidSeatingMapExtensionError,
  MissingSeatingMapFileError,
  SeatingMapFileTooLargeError,
} from '../../domain/seating-map.errors';
import type { UploadSeatingMapInput, UploadSeatingMapResult } from '../../domain/seating-map.types';
import type { SvgElementIdExtractor } from '../services/svg-element-id-extractor';
import type { SvgSanitizer } from '../services/svg-sanitizer';

const SVG_CONTENT_TYPE = 'image/svg+xml';

export class UploadSeatingMapUseCase {
  constructor(
    private readonly authorizeConcertManagement: AuthorizeConcertManagementUseCase,
    private readonly storage: ObjectStoragePort,
    private readonly seatingMapWriteRepo: SeatingMapWriteRepositoryPort,
    private readonly concertWriteRepo: ConcertWriteRepositoryPort,
    private readonly config: PlatformConfigService,
    private readonly svgSanitizer: SvgSanitizer,
    private readonly svgElementIdExtractor: SvgElementIdExtractor,
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

    const concert = await this.concertWriteRepo.findConcertById(input.concertId);
    if (!concert || concert.status !== 'DRAFT') {
      throw new ConcertNotDraftError();
    }

    this.validateFileMetadata(input);

    const sanitizeResult = this.svgSanitizer.sanitize(input.fileBuffer);
    const sanitizedBuffer = sanitizeResult.sanitizedBuffer;
    const extractedSvgElementIds = this.svgElementIdExtractor.extract(sanitizedBuffer.toString('utf-8'));

    const assetId = randomUUID();
    const storageKey = `seating-maps/${input.concertId}/${assetId}.svg`;
    const publicUrl = this.storage.getPublicUrl(storageKey);
    const checksum = `sha256:${createHash('sha256').update(sanitizedBuffer).digest('hex')}`;
    const sizeBytes = sanitizedBuffer.length;

    await this.storage.putObject({
      key: storageKey,
      content: sanitizedBuffer,
      contentType: SVG_CONTENT_TYPE,
    });

    let result: Awaited<
      ReturnType<typeof this.seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap>
    >;
    try {
      result = await this.seatingMapWriteRepo.createAssetAndAssociateConcertSeatingMap(
        {
          id: assetId,
          storageKey,
          publicUrl,
          originalName: input.originalName,
          contentType: SVG_CONTENT_TYPE,
          sizeBytes,
          checksum,
          uploadedById: input.userId,
          metadata: { svgElementIds: extractedSvgElementIds },
        },
        input.concertId,
      );
    } catch (err) {
      await this.storage.deleteObject(storageKey).catch(() => undefined);
      throw err;
    }

    if (result.replacedStorageKey) {
      await this.storage.deleteObject(result.replacedStorageKey).catch(() => undefined);
    }

    return {
      asset: result.asset,
      concert: result.concert,
      removedElements: sanitizeResult.removedElements,
      extractedSvgElementIds,
    };
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
