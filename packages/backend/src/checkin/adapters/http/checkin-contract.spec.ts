import { OnlineScanRequestSchema, OnlineScanResponseSchema } from '@ticketbox/api-types';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import type { OnlineScanResult } from '../../domain/checkin-scan.types';
import { toOnlineScanResponse } from './checkin-contract.mapper';
import { OnlineCheckinDto } from './dto/online-checkin.dto';

const assignmentId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';
const ticketId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';
const checkedInAt = new Date('2026-07-01T12:00:01.000Z');

describe('online check-in HTTP contract', () => {
  it.each<OnlineScanResult>([
    { status: 'accepted', message: 'Accepted', ticketId, checkedInAt, checkinEventId: eventId },
    { status: 'duplicate', message: 'Duplicate' },
    { status: 'duplicate', message: 'Duplicate', ticketId, checkedInAt },
    { status: 'invalid', message: 'Invalid', reasonCode: 'WRONG_CONCERT', ticketId },
    { status: 'unassigned', message: 'Unassigned', reasonCode: 'ASSIGNMENT_MISMATCH' },
  ])('maps and validates $status without undefined fields', (result) => {
    const response = toOnlineScanResponse(result);
    expect(OnlineScanResponseSchema.parse(response)).toEqual(response);
    expect(Object.values(response)).not.toContain(undefined);
  });

  it('serializes accepted Date metadata to ISO strings', () => {
    expect(
      toOnlineScanResponse({ status: 'accepted', message: 'Accepted', ticketId, checkedInAt }),
    ).toEqual({
      status: 'accepted',
      message: 'Accepted',
      ticketId,
      checkedInAt: checkedInAt.toISOString(),
    });
  });
});

describe('OnlineCheckinDto and shared request parity', () => {
  const valid = {
    assignmentId,
    concertId,
    gate: 'Main Gate',
    qrPayload: 'raw-ticket-token',
    scannedAt: '2026-07-01T12:00:00.000Z',
    deviceId: ' installation-id ',
  };

  async function dtoAccepts(value: Record<string, unknown>): Promise<boolean> {
    return (await validate(plainToInstance(OnlineCheckinDto, value))).length === 0;
  }

  it('trims deviceId identically before validation and command mapping', async () => {
    const dto = plainToInstance(OnlineCheckinDto, valid);
    expect(dto.deviceId).toBe('installation-id');
    expect(await validate(dto)).toHaveLength(0);
    expect(OnlineScanRequestSchema.parse(valid).deviceId).toBe('installation-id');
  });

  it.each([
    ['omitted', { ...valid, gate: undefined }, undefined],
    ['valid', { ...valid, gate: 'Main Gate' }, 'Main Gate'],
    ['surrounding whitespace', { ...valid, gate: '  Main Gate  ' }, 'Main Gate'],
  ])('accepts %s gate identically to the canonical schema', async (_name, value, expected) => {
    const dto = plainToInstance(OnlineCheckinDto, value);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.gate).toBe(expected);
    expect(OnlineScanRequestSchema.parse(value).gate).toBe(expected);
  });

  it('rejects blank-after-trim gate identically to the canonical schema', async () => {
    const value = { ...valid, gate: '   ' };
    expect(await dtoAccepts(value)).toBe(false);
    expect(OnlineScanRequestSchema.safeParse(value).success).toBe(false);
  });

  it.each([
    { ...valid, deviceId: undefined },
    { ...valid, deviceId: '   ' },
    { ...valid, deviceId: 'x'.repeat(161) },
  ])('rejects device IDs rejected by the canonical schema', async (value) => {
    expect(await dtoAccepts(value)).toBe(false);
    expect(OnlineScanRequestSchema.safeParse(value).success).toBe(false);
  });
});
