import { createHash } from 'node:crypto';

import type { AiBioGeneratorPort } from '../../domain/ports/ai-bio-generator.port';
import type { GeneratedArtistBio } from '../../domain/artist-bio.types';

export class DeterministicArtistBioGeneratorAdapter implements AiBioGeneratorPort {
  async generateBio(cleanedText: string): Promise<GeneratedArtistBio> {
    const normalized = cleanedText.replace(/\s+/g, ' ').trim();
    const seed = createHash('sha256').update(normalized).digest('hex').slice(0, 8);
    const firstSentence = normalized.split(/[.!?]/)[0]?.trim() || normalized.slice(0, 160);
    const excerpt =
      firstSentence.length > 180 ? `${firstSentence.slice(0, 177)}...` : firstSentence;

    return {
      provider: 'local-deterministic',
      bio: `Gioi thieu nghe si: ${excerpt}. Ban tom tat nay duoc tao tu press kit da tai len va ma tham chieu ${seed}.`,
    };
  }
}
