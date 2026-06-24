import { describe, expect, it } from 'vitest';

import type { ScanWorkflowState } from './scan-workflow';
import { canSubmitScan } from './scanner-screen-state';

describe('ScannerScreen readiness controls', () => {
  it.each<ScanWorkflowState>([
    { status: 'initializing' },
    {
      status: 'submitting',
      request: {
        assignmentId: '11111111-1111-4111-8111-111111111111',
        concertId: '22222222-2222-4222-8222-222222222222',
        qrPayload: 'raw',
        scannedAt: '2026-07-01T12:00:00.000Z',
        deviceId: '88888888-8888-4888-8888-888888888888',
      },
    },
    { status: 'recoverable-error', message: 'secure storage unavailable' },
    { status: 'result', result: { status: 'duplicate', message: 'Already checked in' } },
  ])('disables scan submission while state is $status', (state) => {
    expect(canSubmitScan(state)).toBe(false);
  });

  it('enables scan submission only in ready state', () => {
    expect(canSubmitScan({ status: 'ready' })).toBe(true);
  });
});

describe('camera decode gating', () => {
  // The camera fires onBarcodeScanned every frame; the handler is wired to
  // canSubmitScan(state) so decodes are only forwarded while the workflow is ready.
  it('accepts a decode only when the workflow is ready', () => {
    expect(canSubmitScan({ status: 'ready' })).toBe(true);
  });

  it.each<ScanWorkflowState>([
    { status: 'initializing' },
    { status: 'recoverable-error', message: 'camera permission denied' },
    { status: 'result', result: { status: 'duplicate', message: 'Already checked in' } },
  ])('suspends decode handling while state is $status', (state) => {
    expect(canSubmitScan(state)).toBe(false);
  });
});
