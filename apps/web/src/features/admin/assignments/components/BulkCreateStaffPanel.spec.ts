import { describe, expect, it } from 'vitest';

import { generatePreviewEmails } from '../email-preview';

describe('generatePreviewEmails', () => {
  it('builds the numeric-suffixed preview sequence', () => {
    expect(generatePreviewEmails('abc@gmail.com', 3)).toEqual([
      'abc@gmail.com',
      'abc1@gmail.com',
      'abc2@gmail.com',
    ]);
  });

  it('normalizes email casing and whitespace', () => {
    expect(generatePreviewEmails('  ABC@Gmail.COM  ', 2)).toEqual([
      'abc@gmail.com',
      'abc1@gmail.com',
    ]);
  });

  it('returns an empty preview for invalid input', () => {
    expect(generatePreviewEmails('not-email', 3)).toEqual([]);
    expect(generatePreviewEmails('abc@gmail.com', 0)).toEqual([]);
    expect(generatePreviewEmails('abc@gmail.com', 101)).toEqual([]);
  });
});
