import { describe, expect, it } from 'vitest';

import { QrcodePngRenderer } from './qrcode-png-renderer';

describe('QrcodePngRenderer', () => {
  it('renders a PNG buffer for an opaque ticket payload', async () => {
    const buffer = await new QrcodePngRenderer().renderPng('opaque-ticket-payload');

    expect(buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });
});
