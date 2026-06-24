import type { VnpayCallbackPayload } from '../../../domain/ports/payment-gateway.port';

export function normalizeVnpayQuery(query: Record<string, unknown>): VnpayCallbackPayload {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([key]) => key.startsWith('vnp_'))
      .map(([key, value]) => [
        key,
        Array.isArray(value) ? String(value[0] ?? '') : String(value ?? ''),
      ]),
  );
}
