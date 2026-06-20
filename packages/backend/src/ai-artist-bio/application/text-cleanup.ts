import { ArtistBioProcessingError } from '../domain/errors';

export function cleanExtractedPdfText(rawText: string, maxChars: number): string {
  const cleaned = rawText
    .replace(/\u0000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length === 0) {
    throw new ArtistBioProcessingError('The PDF did not contain usable text.');
  }

  return cleaned.length > maxChars ? cleaned.slice(0, maxChars).trim() : cleaned;
}
