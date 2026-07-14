import { describe, expect, it } from 'vitest';

import {
  WAITING_ROOM_DEFAULT_DRAFT,
  createWaitingRoomDraft,
  hasLowConcurrencyWarning,
  hasUnsavedWaitingRoomChanges,
  validateWaitingRoomDraft,
  waitingRoomMode,
} from './waiting-room-form';

const config = {
  id: '11111111-1111-4111-8111-111111111111', concertId: '22222222-2222-4222-8222-222222222222',
  enabled: false, autoActivate: false, manualOverride: 'NONE' as const,
  maxConcurrency: 500, admissionTtlSeconds: 600, activateThreshold: 500,
  deactivateThreshold: 100, cooldownSeconds: 60,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('waiting-room form', () => {
  it('uses disabled backend-compatible defaults', () => {
    expect(WAITING_ROOM_DEFAULT_DRAFT).toMatchObject({
      enabled: false, autoActivate: false, manualOverride: 'NONE', maxConcurrency: '500',
      admissionTtlSeconds: '600', activateThreshold: '500', deactivateThreshold: '100', cooldownSeconds: '60',
    });
  });

  it('normalizes valid integer values into the contract payload', () => {
    const result = validateWaitingRoomDraft(createWaitingRoomDraft(config));
    expect(result.errors).toEqual({});
    expect(result.payload).toMatchObject({ maxConcurrency: 500, cooldownSeconds: 60 });
  });

  it.each([
    ['empty', ''], ['fractional', '1.5'], ['nan', 'nope'], ['negative', '-1'], ['infinity', 'Infinity'],
  ])('rejects %s numeric input', (_, maxConcurrency) => {
    const result = validateWaitingRoomDraft({ ...createWaitingRoomDraft(config), maxConcurrency });
    expect(result.payload).toBeUndefined();
    expect(result.errors.maxConcurrency).toBeTruthy();
  });

  it('rejects equal or inverted thresholds', () => {
    const result = validateWaitingRoomDraft({
      ...createWaitingRoomDraft(config), activateThreshold: '100', deactivateThreshold: '100',
    });
    expect(result.errors.deactivateThreshold).toContain('nhỏ hơn');
  });

  it('compares normalized draft values and identifies low concurrency', () => {
    expect(hasUnsavedWaitingRoomChanges({ ...createWaitingRoomDraft(config), maxConcurrency: '0500' }, config)).toBe(false);
    expect(hasUnsavedWaitingRoomChanges({ ...createWaitingRoomDraft(config), maxConcurrency: '499' }, config)).toBe(true);
    expect(hasLowConcurrencyWarning({ ...createWaitingRoomDraft(config), maxConcurrency: '1' })).toBe(true);
  });

  it('maps only persisted configuration to non-runtime status labels', () => {
    expect(waitingRoomMode(null).label).toBe('Đang tắt');
    expect(waitingRoomMode({ ...config, enabled: false }).label).toBe('Đang tắt');
    expect(waitingRoomMode({ ...config, enabled: true, manualOverride: 'FORCE_ON' }).label).toBe('Đang bật thủ công');
    expect(waitingRoomMode({ ...config, enabled: true, manualOverride: 'FORCE_OFF' }).label).toBe('Tắt khẩn cấp');
    expect(waitingRoomMode({ ...config, enabled: true, autoActivate: true }).label).toBe('Tự động theo tải');
    expect(waitingRoomMode({ ...config, enabled: true, autoActivate: false }).label).toBe('Chờ bật thủ công');
  });
});
