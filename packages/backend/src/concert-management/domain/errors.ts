export class PublicConcertNotFoundError extends Error {
  constructor(slug: string) {
    super(`Public concert not found: ${slug}`);
    this.name = 'PublicConcertNotFoundError';
  }
}
