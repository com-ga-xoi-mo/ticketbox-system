// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { GuestListReport } from '@ticketbox/api-types';

import {
  buildGuestListUploadRequest,
  downloadGuestListReport,
  fileToBase64,
  serializeGuestListReport,
  validateGuestListFile,
} from './file-helpers';

const batchId = '11111111-1111-4111-8111-111111111111';
const concertId = '22222222-2222-4222-8222-222222222222';

function fakeFile(overrides: Partial<File> = {}): File {
  const bytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
  return {
    name: 'vip.csv',
    size: bytes.length,
    type: 'text/csv',
    arrayBuffer: async () => bytes.buffer,
    ...overrides,
  } as File;
}

describe('guest-list browser file helpers', () => {
  it('accepts supported CSV files and normalizes an empty MIME type', () => {
    expect(validateGuestListFile(fakeFile())).toBe('text/csv');
    expect(validateGuestListFile(fakeFile({ type: '' }))).toBe('text/csv');
    expect(validateGuestListFile(fakeFile({ type: 'application/csv' }))).toBe('application/csv');
  });

  it.each([
    [{ name: 'vip.txt' }, '.csv'],
    [{ size: 0 }, 'không được để trống'],
    [{ size: 5 * 1024 * 1024 + 1 }, '5 MiB'],
    [{ type: 'text/plain' }, 'MIME'],
  ])('rejects an invalid file envelope', (overrides, message) => {
    expect(() => validateGuestListFile(fakeFile(overrides))).toThrow(message);
  });

  it('encodes the original bytes without text conversion', async () => {
    const file = fakeFile();
    expect(await fileToBase64(file)).toBe('AAECf4D/');
    await expect(buildGuestListUploadRequest(file)).resolves.toEqual({
      sourceName: 'vip.csv',
      contentType: 'text/csv',
      contentBase64: 'AAECf4D/',
    });
  });

  it('serializes only a valid report and downloads it as JSON', () => {
    const report: GuestListReport = {
      batchId,
      concertId,
      checksum: 'a'.repeat(64),
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        importedRows: 0,
        updatedRows: 0,
        cancelledRows: 0,
        conflictRows: 0,
      },
      rows: [],
    };
    expect(JSON.parse(serializeGuestListReport(report))).toEqual(report);
    const createObjectURL = vi.fn().mockReturnValue('blob:report');
    const revokeObjectURL = vi.fn();
    Object.defineProperties(URL, {
      createObjectURL: { value: createObjectURL, configurable: true },
      revokeObjectURL: { value: revokeObjectURL, configurable: true },
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadGuestListReport(report);
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
