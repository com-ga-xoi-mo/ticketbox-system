import { extname } from 'node:path';

import {
  InvalidPosterContentTypeError,
  InvalidPosterExtensionError,
  InvalidPosterMagicBytesError,
  MissingPosterFileError,
  PosterFileTooLargeError,
} from '../../domain/poster.errors';
import type { UploadPosterInput } from '../../domain/poster.types';

export type ValidatedPosterImage = {
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  extension: 'png' | 'jpg' | 'webp';
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export class PosterImageValidator {
  validate(input: UploadPosterInput, maxBytes: number): ValidatedPosterImage {
    if (!input.fileBuffer || input.fileBuffer.length === 0) {
      throw new MissingPosterFileError();
    }

    const contentType = this.normalizeContentType(input.mimeType);
    if (!contentType) {
      throw new InvalidPosterContentTypeError(input.mimeType);
    }

    if (input.sizeBytes > maxBytes || input.fileBuffer.length > maxBytes) {
      throw new PosterFileTooLargeError(input.sizeBytes, maxBytes);
    }

    const extension = this.validateExtension(input.originalName, contentType);
    if (!this.hasValidMagicBytes(input.fileBuffer, contentType)) {
      throw new InvalidPosterMagicBytesError(input.mimeType);
    }

    return { contentType, extension };
  }

  private normalizeContentType(contentType: string): ValidatedPosterImage['contentType'] | null {
    switch (contentType.toLowerCase()) {
      case 'image/png':
        return 'image/png';
      case 'image/jpeg':
      case 'image/jpg':
        return 'image/jpeg';
      case 'image/webp':
        return 'image/webp';
      default:
        return null;
    }
  }

  private validateExtension(
    originalName: string,
    contentType: ValidatedPosterImage['contentType'],
  ): ValidatedPosterImage['extension'] {
    const extension = extname(originalName).toLowerCase();
    if (contentType === 'image/png' && extension === '.png') {
      return 'png';
    }
    if (contentType === 'image/jpeg' && (extension === '.jpg' || extension === '.jpeg')) {
      return 'jpg';
    }
    if (contentType === 'image/webp' && extension === '.webp') {
      return 'webp';
    }
    throw new InvalidPosterExtensionError(originalName);
  }

  private hasValidMagicBytes(
    buffer: Buffer,
    contentType: ValidatedPosterImage['contentType'],
  ): boolean {
    if (contentType === 'image/png') {
      return buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
    }
    if (contentType === 'image/jpeg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
}
