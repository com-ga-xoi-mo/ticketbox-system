export const QR_IMAGE_RENDERER = Symbol('QrImageRendererPort');

export interface QrImageRendererPort {
  renderPng(payload: string): Promise<Buffer>;
}
