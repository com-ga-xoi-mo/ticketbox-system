import type { GeneratedArtistBio } from '../artist-bio.types';

export const AI_BIO_GENERATOR = Symbol('AiBioGeneratorPort');

export interface AiBioGeneratorPort {
  generateBio(cleanedText: string): Promise<GeneratedArtistBio>;
}
