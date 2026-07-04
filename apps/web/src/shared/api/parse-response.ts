import type { ZodType } from 'zod';

/**
 * Validates a successful API response against its shared contract schema.
 * On mismatch it logs the issues for debugging and throws a safe, generic
 * error so raw payloads never reach the UI.
 */
export function parseResponse<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn('Unexpected API response shape', result.error.issues);
    throw new Error('Received an unexpected response from the server.');
  }
  return result.data;
}
