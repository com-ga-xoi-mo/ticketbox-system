import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { AiBioGeneratorPort } from '../../domain/ports/ai-bio-generator.port';
import { DeterministicArtistBioGeneratorAdapter } from './deterministic-artist-bio-generator.adapter';
import { GeminiArtistBioGeneratorAdapter } from './gemini-artist-bio-generator.adapter';

export function createArtistBioGenerator(config: PlatformConfigService): AiBioGeneratorPort {
  if (config.aiArtistBioProvider === 'gemini' && config.geminiApiKey) {
    return new GeminiArtistBioGeneratorAdapter({
      apiKey: config.geminiApiKey,
      apiUrl: config.geminiApiUrl,
      model: config.geminiModel,
      timeoutMs: config.geminiTimeoutMs,
    });
  }

  return new DeterministicArtistBioGeneratorAdapter();
}
