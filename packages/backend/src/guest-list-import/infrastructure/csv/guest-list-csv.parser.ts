import { GuestListValidationError } from '../../domain/errors';
import {
  hasNaturalIdentifier,
  normalizeEmail,
  normalizeExternalRef,
  normalizePhone,
} from '../../domain/normalization';
import type { ParsedGuestListRow } from '../../domain/guest-list.types';

import { stripBom } from '../../../shared/encoding/utf8.util';

const REQUIRED_HEADERS = ['guest_name', 'email', 'phone', 'external_ref'] as const;
const ALLOWED_HEADERS = new Set([...REQUIRED_HEADERS, 'action']);

export interface CsvParseOptions {
  maxBytes: number;
  maxRows: number;
}

export class GuestListCsvParser {
  constructor(private readonly options: CsvParseOptions) {}

  parse(content: Buffer, contentType: string): ParsedGuestListRow[] {
    if (content.length > this.options.maxBytes) {
      throw new GuestListValidationError('FILE_TOO_LARGE', 'CSV exceeds configured byte limit');
    }
    if (!['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(contentType)) {
      throw new GuestListValidationError(
        'UNSUPPORTED_CONTENT_TYPE',
        'Unsupported CSV content type',
      );
    }
    if (content.includes(0)) {
      throw new GuestListValidationError('INVALID_ENCODING', 'CSV contains NUL bytes');
    }
    const text = stripBom(new TextDecoder('utf-8', { fatal: true }).decode(content));
    const records = parseCsvRecords(text);
    if (records.length === 0) throw new GuestListValidationError('EMPTY_FILE', 'CSV is empty');
    const headers = records[0].map((header) => header.trim().toLowerCase());
    if (new Set(headers).size !== headers.length) {
      throw new GuestListValidationError('INVALID_HEADER', 'CSV contains duplicate headers');
    }
    if (headers.some((header) => !ALLOWED_HEADERS.has(header))) {
      throw new GuestListValidationError('INVALID_HEADER', 'CSV contains unknown headers');
    }
    if (REQUIRED_HEADERS.some((header) => !headers.includes(header))) {
      throw new GuestListValidationError('INVALID_HEADER', 'CSV is missing required headers');
    }
    const dataRecords = records.slice(1).filter((record) => record.some((value) => value.trim()));
    if (dataRecords.some((record) => record.length !== headers.length)) {
      throw new GuestListValidationError(
        'INVALID_CSV',
        'CSV record width does not match the header',
      );
    }
    if (dataRecords.length > this.options.maxRows) {
      throw new GuestListValidationError('ROW_LIMIT_EXCEEDED', 'CSV exceeds configured row limit');
    }
    return dataRecords.map((record, index) => this.toRow(headers, record, index + 2));
  }

  private toRow(headers: string[], values: string[], rowNumber: number): ParsedGuestListRow {
    const value = (name: string) => values[headers.indexOf(name)]?.trim() || undefined;
    const actionValue = value('action')?.toUpperCase() || 'UPSERT';
    const email = value('email');
    const phone = value('phone');
    const row: ParsedGuestListRow = {
      rowNumber,
      action: actionValue === 'CANCEL' ? 'CANCEL' : 'UPSERT',
      guestName: value('guest_name'),
      email,
      normalizedEmail: normalizeEmail(email),
      phone,
      normalizedPhone: normalizePhone(phone),
      externalRef: normalizeExternalRef(value('external_ref')),
    };
    if (!['UPSERT', 'CANCEL'].includes(actionValue)) row.validationReason = 'Unsupported action';
    else if (email && !row.normalizedEmail) row.validationReason = 'Invalid email';
    else if (phone && !row.normalizedPhone) row.validationReason = 'Invalid phone';
    else if (!hasNaturalIdentifier(row))
      row.validationReason = 'At least one natural identifier is required';
    else if (row.action === 'UPSERT' && !row.guestName)
      row.validationReason = 'guest_name is required for UPSERT';
    return row;
  }
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n') {
      record.push(field.replace(/\r$/, ''));
      records.push(record);
      record = [];
      field = '';
    } else field += char;
  }
  if (quoted)
    throw new GuestListValidationError('INVALID_CSV', 'CSV has an unterminated quoted field');
  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ''));
    records.push(record);
  }
  return records;
}
