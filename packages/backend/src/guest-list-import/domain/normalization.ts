import { createHash } from 'node:crypto';

export function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function normalizeEmail(value?: string): string | undefined {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : undefined;
}

export function normalizePhone(value?: string): string | undefined {
  const compact = value?.trim().replace(/[\s().-]/g, '');
  if (!compact) return undefined;
  if (/^0\d{8,10}$/.test(compact)) return `+84${compact.slice(1)}`;
  if (/^84\d{8,10}$/.test(compact)) return `+${compact}`;
  if (/^\+\d{9,15}$/.test(compact)) return compact;
  return undefined;
}

export function normalizeExternalRef(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function hasNaturalIdentifier(value: {
  normalizedEmail?: string;
  normalizedPhone?: string;
  externalRef?: string;
}): boolean {
  return Boolean(value.normalizedEmail || value.normalizedPhone || value.externalRef);
}

export function identityFingerprint(value: {
  normalizedEmail?: string;
  normalizedPhone?: string;
  externalRef?: string;
}): string[] {
  return [
    value.normalizedEmail && `email:${value.normalizedEmail}`,
    value.normalizedPhone && `phone:${value.normalizedPhone}`,
    value.externalRef && `external:${value.externalRef}`,
  ].filter((item): item is string => Boolean(item));
}
