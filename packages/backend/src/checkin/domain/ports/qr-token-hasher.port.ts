export const QR_TOKEN_HASHER = Symbol('QrTokenHasher');

export interface QrTokenHasherPort {
  hashPayload(payload: string): string;
}
