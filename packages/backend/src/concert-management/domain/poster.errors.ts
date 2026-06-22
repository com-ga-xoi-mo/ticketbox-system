export class MissingPosterFileError extends Error {
  constructor() {
    super('Poster image file is required');
    this.name = 'MissingPosterFileError';
  }
}

export class InvalidPosterContentTypeError extends Error {
  constructor(contentType: string | undefined) {
    super(`Invalid poster image content type: ${contentType ?? 'unknown'}`);
    this.name = 'InvalidPosterContentTypeError';
  }
}

export class InvalidPosterExtensionError extends Error {
  constructor(originalName: string | undefined) {
    super(`Invalid poster image file extension: ${originalName ?? 'unknown'}`);
    this.name = 'InvalidPosterExtensionError';
  }
}

export class InvalidPosterMagicBytesError extends Error {
  constructor(contentType: string | undefined) {
    super(`Poster image content does not match content type: ${contentType ?? 'unknown'}`);
    this.name = 'InvalidPosterMagicBytesError';
  }
}

export class PosterFileTooLargeError extends Error {
  constructor(sizeBytes: number, maxBytes: number) {
    super(`Poster image file is too large: ${sizeBytes} bytes exceeds ${maxBytes} bytes`);
    this.name = 'PosterFileTooLargeError';
  }
}
