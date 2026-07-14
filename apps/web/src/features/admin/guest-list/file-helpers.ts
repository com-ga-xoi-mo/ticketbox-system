import {
  GUEST_LIST_MAX_FILE_BYTES,
  GuestListContentTypeSchema,
  GuestListReportSchema,
  type AdminGuestListUploadRequest,
  type GuestListContentType,
  type GuestListReport,
} from '@ticketbox/api-types';

export class GuestListFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GuestListFileValidationError';
  }
}

export function validateGuestListFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
): GuestListContentType {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new GuestListFileValidationError('Vui lòng chọn tệp có phần mở rộng .csv.');
  }
  if (file.size === 0) {
    throw new GuestListFileValidationError('Tệp CSV không được để trống.');
  }
  if (file.size > GUEST_LIST_MAX_FILE_BYTES) {
    throw new GuestListFileValidationError('Tệp CSV không được vượt quá 5 MiB.');
  }
  const contentType = file.type || 'text/csv';
  const parsed = GuestListContentTypeSchema.safeParse(contentType);
  if (!parsed.success) {
    throw new GuestListFileValidationError('Định dạng MIME của tệp CSV không được hỗ trợ.');
  }
  return parsed.data;
}

export async function fileToBase64(file: Pick<File, 'arrayBuffer'>): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export async function buildGuestListUploadRequest(
  file: File,
): Promise<AdminGuestListUploadRequest> {
  const contentType = validateGuestListFile(file);
  return {
    sourceName: file.name,
    contentType,
    contentBase64: await fileToBase64(file),
  };
}

export function serializeGuestListReport(report: GuestListReport): string {
  return `${JSON.stringify(GuestListReportSchema.parse(report), null, 2)}\n`;
}

export function downloadGuestListReport(report: GuestListReport): void {
  const blob = new Blob([serializeGuestListReport(report)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `guest-list-report-${report.batchId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
