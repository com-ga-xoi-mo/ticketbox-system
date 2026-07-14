import { describe, expect, it } from 'vitest';

import { ArtistBioFileValidationError, validateArtistBioPressKit } from './validation';

function pdfFile(name = 'press-kit.pdf', type = 'application/pdf', content = '%PDF-1.7') {
  return new File([content], name, { type });
}

describe('artist bio PDF validation', () => {
  it('accepts a valid PDF signature', async () => {
    await expect(validateArtistBioPressKit(pdfFile())).resolves.toBeUndefined();
  });

  it.each([
    [pdfFile('press.txt')],
    [pdfFile('press.pdf', 'text/plain')],
    [pdfFile('press.pdf', 'application/pdf', '')],
    [pdfFile('press.pdf', 'application/pdf', 'not-pdf')],
  ])('rejects invalid files', async (file) => {
    await expect(validateArtistBioPressKit(file)).rejects.toBeInstanceOf(
      ArtistBioFileValidationError,
    );
  });
});
