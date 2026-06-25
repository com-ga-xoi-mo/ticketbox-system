import { describe, expect, it } from 'vitest';

import { buildCredentialPdfFileName, createCredentialPdfArrayBuffer } from './credential-pdf';

const credentials = [
  {
    userId: 'user-1',
    displayName: 'Gate Staff 1',
    email: 'abc@gmail.com',
    password: 'secret-one',
    assignmentId: 'assignment-1',
    concertId: 'concert-1',
    concertTitle: 'Summer Live',
  },
];

describe('credential PDF export', () => {
  it('creates a password-protected PDF with encryption marker', () => {
    const output = createCredentialPdfArrayBuffer({
      concertTitle: 'Summer Live',
      createdAt: new Date('2026-06-25T12:00:00.000Z'),
      pdfPassword: 'open-this-file',
      credentials,
    });

    expect(bufferToBinaryString(output)).toContain('/Encrypt');
  });

  it('requires a PDF password before generating output', () => {
    expect(() =>
      createCredentialPdfArrayBuffer({
        concertTitle: 'Summer Live',
        createdAt: new Date('2026-06-25T12:00:00.000Z'),
        pdfPassword: '',
        credentials,
      }),
    ).toThrow('PDF password is required');
  });

  it('builds a stable filename from concert title and date', () => {
    expect(
      buildCredentialPdfFileName('Summer Live: Ho Chi Minh!', new Date('2026-06-25T12:00:00.000Z')),
    ).toBe('checkin-staff-credentials-summer-live-ho-chi-minh-2026-06-25.pdf');
  });
});

function bufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = '';
  for (let index = 0; index < bytes.length; index += 8192) {
    text += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return text;
}
