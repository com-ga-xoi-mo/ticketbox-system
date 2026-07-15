import { extname } from 'node:path';

export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export class InvalidPaymentProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPaymentProofError';
  }
}

export type ValidatedPaymentProofImage = {
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  extension: 'png' | 'jpg' | 'webp';
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export class PaymentProofImageValidator {
  validate(input: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  }): ValidatedPaymentProofImage {
    if (!input.fileBuffer.length) {
      throw new InvalidPaymentProofError('Vui lòng chọn ảnh bill chuyển khoản.');
    }

    const contentType = this.normalizeContentType(input.mimeType);
    if (!contentType) {
      throw new InvalidPaymentProofError('Bill phải là ảnh PNG, JPEG hoặc WebP.');
    }

    if (
      input.sizeBytes > PAYMENT_PROOF_MAX_BYTES ||
      input.fileBuffer.length > PAYMENT_PROOF_MAX_BYTES
    ) {
      throw new InvalidPaymentProofError('Ảnh bill không được vượt quá 5 MB.');
    }

    const extension = this.validateExtension(input.originalName, contentType);
    if (!this.hasValidMagicBytes(input.fileBuffer, contentType)) {
      throw new InvalidPaymentProofError('Nội dung file bill không hợp lệ.');
    }

    return { contentType, extension };
  }

  private normalizeContentType(
    contentType: string,
  ): ValidatedPaymentProofImage['contentType'] | null {
    switch (contentType.toLowerCase()) {
      case 'image/png':
        return 'image/png';
      case 'image/jpeg':
      case 'image/jpg':
        return 'image/jpeg';
      case 'image/webp':
        return 'image/webp';
      default:
        return null;
    }
  }

  private validateExtension(
    originalName: string,
    contentType: ValidatedPaymentProofImage['contentType'],
  ): ValidatedPaymentProofImage['extension'] {
    const extension = extname(originalName).toLowerCase();
    if (contentType === 'image/png' && extension === '.png') return 'png';
    if (contentType === 'image/jpeg' && (extension === '.jpg' || extension === '.jpeg'))
      return 'jpg';
    if (contentType === 'image/webp' && extension === '.webp') return 'webp';
    throw new InvalidPaymentProofError('Phần mở rộng file bill không khớp với loại ảnh.');
  }

  private hasValidMagicBytes(
    buffer: Buffer,
    contentType: ValidatedPaymentProofImage['contentType'],
  ): boolean {
    if (contentType === 'image/png') {
      return buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
    }
    if (contentType === 'image/jpeg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
}
