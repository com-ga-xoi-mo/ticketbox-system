import QRCode from 'qrcode';

import type { QrImageRendererPort } from '../../domain/ports/qr-image-renderer.port';

export class QrcodePngRenderer implements QrImageRendererPort {
  async renderPng(payload: string): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#FFFFFFFF',
      },
    });
  }
}
