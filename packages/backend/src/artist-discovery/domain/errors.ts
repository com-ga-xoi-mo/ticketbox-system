export class ArtistNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Artist not found: ${identifier}`);
    this.name = 'ArtistNotFoundError';
  }
}

export class ArtistSlugConflictError extends Error {
  constructor(slug: string) {
    super(`Artist slug already exists: ${slug}`);
    this.name = 'ArtistSlugConflictError';
  }
}

export class ArtistSlugInvalidError extends Error {
  constructor(slug: string) {
    super(`Artist slug is invalid (only lowercase alphanumeric, hyphens, underscores allowed): ${slug}`);
    this.name = 'ArtistSlugInvalidError';
  }
}

export class ArtistAlreadyFollowedError extends Error {
  constructor(userId: string, artistId: string) {
    super(`User ${userId} is already following artist ${artistId}`);
    this.name = 'ArtistAlreadyFollowedError';
  }
}

export class ArtistAlreadyFavoritedError extends Error {
  constructor(userId: string, artistId: string) {
    super(`User ${userId} has already favorited artist ${artistId}`);
    this.name = 'ArtistAlreadyFavoritedError';
  }
}
