export const ARTIST_BIO_PDF_MAX_BYTES = 5 * 1024 * 1024;

export class ArtistBioFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtistBioFileValidationError';
  }
}

export async function validateArtistBioPressKit(file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    throw new ArtistBioFileValidationError('Tệp phải có phần mở rộng .pdf.');
  }
  if (file.type !== 'application/pdf') {
    throw new ArtistBioFileValidationError('Tệp phải có định dạng PDF.');
  }
  if (file.size === 0) {
    throw new ArtistBioFileValidationError('Tệp PDF không được để trống.');
  }
  if (file.size > ARTIST_BIO_PDF_MAX_BYTES) {
    throw new ArtistBioFileValidationError('Tệp PDF không được vượt quá 5 MB.');
  }

  const signature = new TextDecoder('ascii').decode(await file.slice(0, 5).arrayBuffer());
  if (signature !== '%PDF-') {
    throw new ArtistBioFileValidationError('Tệp không có chữ ký PDF hợp lệ.');
  }
}

export async function encodeFileBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
