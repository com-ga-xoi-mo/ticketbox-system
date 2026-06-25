import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlatformConfigService } from '../../../platform/config/platform-config.service';
import { createArtistBioGenerator } from './artist-bio-generator.provider';
import { DeterministicArtistBioGeneratorAdapter } from './deterministic-artist-bio-generator.adapter';
import { GeminiArtistBioGeneratorAdapter } from './gemini-artist-bio-generator.adapter';

function config(overrides: Partial<PlatformConfigService> = {}): PlatformConfigService {
  return {
    aiArtistBioProvider: 'local',
    geminiApiKey: undefined,
    geminiApiUrl: 'https://gemini.test/v1beta/models',
    geminiModel: 'gemini-test',
    geminiTimeoutMs: 1000,
    ...overrides,
  } as PlatformConfigService;
}

describe('artist bio generator adapters', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates stable local fallback output without network calls', async () => {
    const generator = new DeterministicArtistBioGeneratorAdapter();

    const first = await generator.generateBio('Artist has a decade of sold-out shows.');
    const second = await generator.generateBio('Artist has a decade of sold-out shows.');

    expect(first).toEqual(second);
    expect(first.provider).toBe('local-deterministic');
    expect(first.bio).toContain('ma tham chieu');
  });

  it('selects the local fallback unless Gemini mode and credentials are explicitly configured', () => {
    expect(createArtistBioGenerator(config())).toBeInstanceOf(
      DeterministicArtistBioGeneratorAdapter,
    );
    expect(createArtistBioGenerator(config({ aiArtistBioProvider: 'gemini' }))).toBeInstanceOf(
      DeterministicArtistBioGeneratorAdapter,
    );
  });

  it('selects the Gemini-compatible adapter when provider mode and key are configured', () => {
    expect(
      createArtistBioGenerator(
        config({ aiArtistBioProvider: 'gemini', geminiApiKey: 'secret-key' }),
      ),
    ).toBeInstanceOf(GeminiArtistBioGeneratorAdapter);
  });

  it('surfaces Gemini provider failures without falling back silently', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
      })),
    );
    const generator = new GeminiArtistBioGeneratorAdapter({
      apiKey: 'secret-key',
      apiUrl: 'https://gemini.test/v1beta/models',
      model: 'gemini-test',
      timeoutMs: 1000,
    });

    await expect(generator.generateBio('usable text')).rejects.toThrow(
      'Gemini artist bio generation failed with status 503',
    );
  });
});
