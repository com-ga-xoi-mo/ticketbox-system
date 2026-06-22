export class MissingSeatingMapFileError extends Error {
  constructor() {
    super('Seating map file is required');
    this.name = 'MissingSeatingMapFileError';
  }
}

export class InvalidSeatingMapContentTypeError extends Error {
  constructor(contentType: string | undefined) {
    super(`Invalid seating map content type: ${contentType ?? 'unknown'}`);
    this.name = 'InvalidSeatingMapContentTypeError';
  }
}

export class InvalidSeatingMapExtensionError extends Error {
  constructor(originalName: string | undefined) {
    super(`Invalid seating map file extension: ${originalName ?? 'unknown'}`);
    this.name = 'InvalidSeatingMapExtensionError';
  }
}

export class SeatingMapFileTooLargeError extends Error {
  constructor(sizeBytes: number, maxBytes: number) {
    super(`Seating map file is too large: ${sizeBytes} bytes exceeds ${maxBytes} bytes`);
    this.name = 'SeatingMapFileTooLargeError';
  }
}

export class UnsafeSeatingMapSvgError extends Error {
  constructor(readonly reasons: string[]) {
    super(`Unsafe seating map SVG: ${reasons.join(', ')}`);
    this.name = 'UnsafeSeatingMapSvgError';
  }
}

export class DuplicateSvgElementIdError extends Error {
  constructor(svgElementId: string) {
    super(`Duplicate SVG element id in request: ${svgElementId}`);
    this.name = 'DuplicateSvgElementIdError';
  }
}

export class CrossConcertZoneMappingError extends Error {
  constructor() {
    super('Ticket type and seating zones must belong to the same concert');
    this.name = 'CrossConcertZoneMappingError';
  }
}
