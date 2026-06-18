import type { AiBioGeneratorPort } from '../../domain/ports/ai-bio-generator.port';
import type { GeneratedArtistBio } from '../../domain/artist-bio.types';

export interface GeminiArtistBioGeneratorOptions {
  apiKey: string;
  apiUrl: string;
  model: string;
  timeoutMs: number;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export class GeminiArtistBioGeneratorAdapter implements AiBioGeneratorPort {
  constructor(private readonly options: GeminiArtistBioGeneratorOptions) {}

  async generateBio(cleanedText: string): Promise<GeneratedArtistBio> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const response = await fetch(
        `${this.options.apiUrl}/${this.options.model}:generateContent?key=${this.options.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Create a concise public artist biography in Vietnamese from this press kit text:\n\n${cleanedText}`,
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini artist bio generation failed with status ${response.status}`);
      }

      const payload = (await response.json()) as GeminiResponse;
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        throw new Error('Gemini artist bio response did not include text.');
      }

      return {
        provider: `gemini:${this.options.model}`,
        bio: text,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

