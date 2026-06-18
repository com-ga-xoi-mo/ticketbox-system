import { createHash } from 'node:crypto';

import { InvalidPressKitError } from '../domain/errors';
import type { PressKitUpload } from '../domain/artist-bio.types';

const PDF_SIGNATURE = '%PDF-';

export function validatePressKitUpload(
  upload: PressKitUpload,
  maxBytes: number,
): { checksum: string; sizeBytes: number } {
  if (!upload.originalName || upload.originalName.trim().length === 0) {
    throw new InvalidPressKitError('Press kit filename is required.');
  }

  if (!upload.originalName.toLowerCase().endsWith('.pdf')) {
    throw new InvalidPressKitError('Press kit must use a .pdf extension.');
  }

  if (upload.contentType !== 'application/pdf') {
    throw new InvalidPressKitError('Press kit content type must be application/pdf.');
  }

  if (upload.content.length === 0) {
    throw new InvalidPressKitError('Press kit PDF cannot be empty.');
  }

  if (upload.content.length > maxBytes) {
    throw new InvalidPressKitError(`Press kit PDF exceeds the ${maxBytes} byte limit.`);
  }

  if (upload.content.subarray(0, PDF_SIGNATURE.length).toString('ascii') !== PDF_SIGNATURE) {
    throw new InvalidPressKitError('Press kit file signature is not a valid PDF.');
  }

  return {
    checksum: createHash('sha256').update(upload.content).digest('hex'),
    sizeBytes: upload.content.length,
  };
}

export function buildPressKitStorageKey(concertId: string, checksum: string): string {
  return `artist-bio/${concertId}/${checksum}.pdf`;
}

