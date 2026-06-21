import { describe, expect, it } from 'vitest';
import type { GuestListValidationError } from '../../domain/errors';
import { GuestListCsvParser } from './guest-list-csv.parser';

const parser = new GuestListCsvParser({ maxBytes: 4096, maxRows: 3 });
describe('GuestListCsvParser', () => {
  it('parses valid, invalid, duplicate-ready and cancellation rows without failing the file', () => {
    const rows = parser.parse(
      Buffer.from(
        'guest_name,email,phone,external_ref,action\nVIP,VIP@X.test,0901234567,,\n,,bad,ext-2,UPSERT\n,,,ext-3,CANCEL',
      ),
      'text/csv',
    );
    expect(rows[0]).toMatchObject({
      normalizedEmail: 'vip@x.test',
      normalizedPhone: '+84901234567',
      action: 'UPSERT',
    });
    expect(rows[1].validationReason).toBe('Invalid phone');
    expect(rows[2]).toMatchObject({ action: 'CANCEL', externalRef: 'ext-3' });
  });
  it.each([
    ['guest_name,email,phone\nVIP,a@b.test,0901234567', 'INVALID_HEADER'],
    ['guest_name,email,phone,external_ref,unknown\nVIP,a@b.test,0901234567,,x', 'INVALID_HEADER'],
  ])('rejects invalid headers atomically', (csv, code) => {
    expect(() => parser.parse(Buffer.from(csv), 'text/csv')).toThrowError(
      expect.objectContaining<Partial<GuestListValidationError>>({ code }),
    );
  });
  it('enforces row, byte, content type, encoding, and NUL limits', () => {
    expect(() => parser.parse(Buffer.from('x'), 'application/json')).toThrow();
    expect(() => parser.parse(Buffer.alloc(5000), 'text/csv')).toThrow();
    expect(() => parser.parse(Buffer.from([0]), 'text/csv')).toThrow();
    expect(() =>
      parser.parse(
        Buffer.from(
          'guest_name,email,phone,external_ref\na,a@x.test,,\nb,b@x.test,,\nc,c@x.test,,\nd,d@x.test,,',
        ),
        'text/csv',
      ),
    ).toThrowError(expect.objectContaining({ code: 'ROW_LIMIT_EXCEEDED' }));
  });
  it.each([
    'guest_name,email,phone,external_ref\nVIP,vip@x.test,,ref,extra',
    'guest_name,email,phone,external_ref\nVIP,vip@x.test',
  ])('rejects malformed record width before returning any rows', (csv) => {
    expect(() => parser.parse(Buffer.from(csv), 'text/csv')).toThrowError(
      expect.objectContaining({ code: 'INVALID_CSV' }),
    );
  });
});
