export interface MobileEnv {
  readonly apiBaseUrl: string;
}

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

function readEnvValue(key: string): string | undefined {
  const processEnv = globalThis.process?.env as Record<string, string | undefined> | undefined;
  return processEnv?.[key];
}

export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function getMobileEnv(): MobileEnv {
  return {
    apiBaseUrl: normalizeBaseUrl(readEnvValue('EXPO_PUBLIC_API_BASE_URL') ?? DEFAULT_API_BASE_URL),
  };
}
