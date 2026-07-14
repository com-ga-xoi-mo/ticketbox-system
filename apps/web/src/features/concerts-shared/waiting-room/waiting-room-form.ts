import {
  ConfigureWaitingRoomRequestSchema,
  type ConfigureWaitingRoomRequest,
  type WaitingRoomConfigResponse,
  type WaitingRoomManualOverride,
} from '@ticketbox/api-types';

export interface WaitingRoomDraft {
  enabled: boolean;
  autoActivate: boolean;
  manualOverride: WaitingRoomManualOverride;
  maxConcurrency: string;
  admissionTtlSeconds: string;
  activateThreshold: string;
  deactivateThreshold: string;
  cooldownSeconds: string;
}

export type WaitingRoomField = keyof WaitingRoomDraft;
export type WaitingRoomFieldErrors = Partial<Record<WaitingRoomField, string>>;

export const WAITING_ROOM_DEFAULT_DRAFT: WaitingRoomDraft = {
  enabled: false,
  autoActivate: false,
  manualOverride: 'NONE',
  maxConcurrency: '500',
  admissionTtlSeconds: '600',
  activateThreshold: '500',
  deactivateThreshold: '100',
  cooldownSeconds: '60',
};

const numericFields = [
  'maxConcurrency',
  'admissionTtlSeconds',
  'activateThreshold',
  'deactivateThreshold',
  'cooldownSeconds',
] as const;

const labels: Record<(typeof numericFields)[number], string> = {
  maxConcurrency: 'Số người vào checkout cùng lúc',
  admissionTtlSeconds: 'Thời hạn lượt vào checkout',
  activateThreshold: 'Ngưỡng tự bật',
  deactivateThreshold: 'Ngưỡng tự tắt',
  cooldownSeconds: 'Thời gian cooldown',
};

export function createWaitingRoomDraft(
  config: WaitingRoomConfigResponse | null | undefined,
): WaitingRoomDraft {
  if (!config) return { ...WAITING_ROOM_DEFAULT_DRAFT };
  return {
    enabled: config.enabled,
    autoActivate: config.autoActivate,
    manualOverride: config.manualOverride,
    maxConcurrency: String(config.maxConcurrency),
    admissionTtlSeconds: String(config.admissionTtlSeconds),
    activateThreshold: String(config.activateThreshold),
    deactivateThreshold: String(config.deactivateThreshold),
    cooldownSeconds: String(config.cooldownSeconds),
  };
}

export function validateWaitingRoomDraft(draft: WaitingRoomDraft): {
  errors: WaitingRoomFieldErrors;
  payload?: ConfigureWaitingRoomRequest;
} {
  const errors: WaitingRoomFieldErrors = {};
  const values: Partial<Record<(typeof numericFields)[number], number>> = {};

  for (const field of numericFields) {
    const raw = draft[field].trim();
    if (!raw) {
      errors[field] = `${labels[field]} là bắt buộc.`;
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      errors[field] = `${labels[field]} phải là số nguyên hợp lệ.`;
      continue;
    }
    values[field] = value;
  }

  if (Object.keys(errors).length > 0) return { errors };

  const payload = {
    enabled: draft.enabled,
    autoActivate: draft.autoActivate,
    manualOverride: draft.manualOverride,
    maxConcurrency: values.maxConcurrency,
    admissionTtlSeconds: values.admissionTtlSeconds,
    activateThreshold: values.activateThreshold,
    deactivateThreshold: values.deactivateThreshold,
    cooldownSeconds: values.cooldownSeconds,
  };
  const parsed = ConfigureWaitingRoomRequestSchema.safeParse(payload);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as WaitingRoomField | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return { errors };
  }
  if (parsed.data.activateThreshold <= parsed.data.deactivateThreshold) {
    return {
      errors: {
        deactivateThreshold: 'Ngưỡng tự tắt phải nhỏ hơn ngưỡng tự bật.',
      },
    };
  }
  return { errors: {}, payload: parsed.data };
}

export function hasUnsavedWaitingRoomChanges(
  draft: WaitingRoomDraft,
  persisted: WaitingRoomConfigResponse | null | undefined,
): boolean {
  if (!persisted) return true;
  const result = validateWaitingRoomDraft(draft);
  if (!result.payload) return true;
  const { payload } = result;
  return (
    payload.enabled !== persisted.enabled ||
    payload.autoActivate !== persisted.autoActivate ||
    payload.manualOverride !== persisted.manualOverride ||
    payload.maxConcurrency !== persisted.maxConcurrency ||
    payload.admissionTtlSeconds !== persisted.admissionTtlSeconds ||
    payload.activateThreshold !== persisted.activateThreshold ||
    payload.deactivateThreshold !== persisted.deactivateThreshold ||
    payload.cooldownSeconds !== persisted.cooldownSeconds
  );
}

export function hasLowConcurrencyWarning(draft: WaitingRoomDraft): boolean {
  const value = Number(draft.maxConcurrency.trim());
  return Number.isInteger(value) && value >= 1 && value < 10;
}

export function waitingRoomMode(
  config: WaitingRoomConfigResponse | null | undefined,
): { label: string; variant: 'muted' | 'success' | 'warning' | 'danger' | 'default' } {
  if (!config || !config.enabled) return { label: 'Đang tắt', variant: 'muted' };
  if (config.manualOverride === 'FORCE_ON') return { label: 'Đang bật thủ công', variant: 'success' };
  if (config.manualOverride === 'FORCE_OFF') return { label: 'Tắt khẩn cấp', variant: 'danger' };
  if (config.autoActivate) return { label: 'Tự động theo tải', variant: 'default' };
  return { label: 'Chờ bật thủ công', variant: 'warning' };
}
