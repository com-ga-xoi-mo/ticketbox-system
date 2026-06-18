export const ARTIST_BIO_QUEUE = Symbol('ArtistBioQueuePort');

export interface ArtistBioQueuePort {
  enqueueRequested(artistBioId: string): Promise<void>;
}

