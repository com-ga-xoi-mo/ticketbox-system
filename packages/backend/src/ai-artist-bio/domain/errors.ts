export class InvalidPressKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPressKitError';
  }
}

export class ArtistBioNotFoundError extends Error {
  constructor(id: string) {
    super(`Artist bio job not found: ${id}`);
    this.name = 'ArtistBioNotFoundError';
  }
}

export class ArtistBioStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtistBioStatusTransitionError';
  }
}

export class ArtistBioProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtistBioProcessingError';
  }
}

