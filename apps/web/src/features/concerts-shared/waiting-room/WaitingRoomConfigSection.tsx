import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { WaitingRoomManualOverride } from '@ticketbox/api-types';
import { toast } from 'sonner';

import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import {
  createWaitingRoomDraft,
  hasLowConcurrencyWarning,
  hasUnsavedWaitingRoomChanges,
  validateWaitingRoomDraft,
  waitingRoomMode,
  type WaitingRoomDraft,
  type WaitingRoomField,
  type WaitingRoomFieldErrors,
} from './waiting-room-form';
import {
  useSaveWaitingRoomConfigMutation,
  useSetWaitingRoomOverrideMutation,
  useWaitingRoomConfig,
} from './waiting-room.hooks';

interface WaitingRoomConfigSectionProps {
  concertId: string;
}

const overrideOptions: Array<{ value: WaitingRoomManualOverride; label: string }> = [
  { value: 'NONE', label: 'Tự động' },
  { value: 'FORCE_ON', label: 'Bật ngay' },
  { value: 'FORCE_OFF', label: 'Tắt ngay' },
];

function configKey(config: { id: string; updatedAt: string } | null | undefined): string | undefined {
  if (config === undefined) return undefined;
  return config ? `${config.id}:${config.updatedAt}` : 'no-config';
}

function Toggle({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-surface-container-low px-3 py-2">
      <label htmlFor={id} className="text-sm font-medium text-on-surface">{label}</label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? 'bg-[linear-gradient(to_right,#db4df5,#813edc)] shadow-[0_4px_14px_rgba(219,77,245,0.35)]'
            : 'bg-white/15'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1 size-4 rounded-full bg-white transition-[left,right] ${
            checked ? 'right-1' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function WaitingRoomConfigSection({ concertId }: WaitingRoomConfigSectionProps) {
  const configQuery = useWaitingRoomConfig(concertId);
  const saveMutation = useSaveWaitingRoomConfigMutation(concertId);
  const overrideMutation = useSetWaitingRoomOverrideMutation(concertId);
  const [draft, setDraft] = useState<WaitingRoomDraft>(() => createWaitingRoomDraft(undefined));
  const [errors, setErrors] = useState<WaitingRoomFieldErrors>({});
  const hydratedKey = useRef<string | undefined>(undefined);

  const persisted = configQuery.data;
  const currentConfigKey = configKey(persisted);
  useEffect(() => {
    if (currentConfigKey && currentConfigKey !== hydratedKey.current) {
      hydratedKey.current = currentConfigKey;
      setDraft(createWaitingRoomDraft(persisted));
      setErrors({});
    }
  }, [currentConfigKey, persisted]);

  const updateDraft = <K extends keyof WaitingRoomDraft>(field: K, value: WaitingRoomDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const preventParentSubmit = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.preventDefault();
  };

  const handleSave = () => {
    if (saveMutation.isPending || overrideMutation.isPending) return;
    const validation = validateWaitingRoomDraft(draft);
    setErrors(validation.errors);
    if (!validation.payload) return;

    saveMutation.mutate(validation.payload, {
      onSuccess: (config) => {
        hydratedKey.current = configKey(config);
        setDraft(createWaitingRoomDraft(config));
        setErrors({});
        toast.success('Đã lưu cấu hình phòng chờ.');
      },
      onError: (error) => toast.error(errorMessage(error, 'Không thể lưu cấu hình phòng chờ.')),
    });
  };

  const handleOverride = (manualOverride: WaitingRoomManualOverride) => {
    if (!persisted?.enabled || overrideMutation.isPending || saveMutation.isPending) return;
    overrideMutation.mutate({ manualOverride }, {
      onSuccess: (config) => {
        hydratedKey.current = configKey(config);
        setDraft((current) => ({ ...current, manualOverride: config.manualOverride }));
        toast.success('Đã cập nhật trạng thái vận hành.');
      },
      onError: (error) => toast.error(errorMessage(error, 'Không thể cập nhật trạng thái vận hành.')),
    });
  };

  if (configQuery.isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Đang tải cấu hình phòng chờ">
        <div className="h-10 animate-pulse rounded-lg bg-white/5" />
        <div className="h-24 animate-pulse rounded-lg bg-white/5" />
      </div>
    );
  }

  if (configQuery.isError) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/10 p-4" role="alert">
        <p className="text-sm text-error">Không thể tải cấu hình phòng chờ. Vui lòng thử lại.</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void configQuery.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  const hasConfig = Boolean(persisted);
  const quickActionsDisabled = !persisted?.enabled || saveMutation.isPending || overrideMutation.isPending;
  const mode = waitingRoomMode(persisted);
  const isDirty = hasUnsavedWaitingRoomChanges(draft, persisted);
  const lowConcurrency = hasLowConcurrencyWarning(draft);

  const numberFields: Array<{
    field: Extract<WaitingRoomField, 'maxConcurrency' | 'admissionTtlSeconds' | 'activateThreshold' | 'deactivateThreshold' | 'cooldownSeconds'>;
    id: string;
    label: string;
    suffix: string;
    min: number;
  }> = [
    { field: 'maxConcurrency', id: 'waiting-room-max-concurrency', label: 'Số người vào checkout cùng lúc', suffix: 'người', min: 1 },
    { field: 'admissionTtlSeconds', id: 'waiting-room-admission-ttl', label: 'Thời hạn lượt vào checkout', suffix: 'giây', min: 1 },
    { field: 'activateThreshold', id: 'waiting-room-activate-threshold', label: 'Ngưỡng tự bật', suffix: 'lượt', min: 1 },
    { field: 'deactivateThreshold', id: 'waiting-room-deactivate-threshold', label: 'Ngưỡng tự tắt', suffix: 'lượt', min: 0 },
    { field: 'cooldownSeconds', id: 'waiting-room-cooldown', label: 'Thời gian cooldown', suffix: 'giây', min: 0 },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-surface-container-low p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-sm font-bold text-on-surface">Cấu hình đã lưu và chế độ vận hành</h4>
            <p className="mt-1 text-xs text-on-surface-variant">Chế độ tự động không phản ánh trạng thái tải Redis hiện tại.</p>
          </div>
          <Badge variant={mode.variant}>{mode.label}</Badge>
        </div>
        {persisted ? (
          <p className="text-xs text-on-surface-variant">
            Cập nhật: {new Date(persisted.updatedAt).toLocaleString('vi-VN')}
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant">Chưa có cấu hình. Phòng chờ hiện đang tắt.</p>
        )}
        {isDirty && <p className="mt-2 text-xs font-medium text-amber-300">Có thay đổi chưa lưu</p>}
      </div>

      <Toggle
        id="waiting-room-enabled"
        label="Bật phòng chờ"
        checked={draft.enabled}
        onChange={(enabled) => updateDraft('enabled', enabled)}
        disabled={saveMutation.isPending || overrideMutation.isPending}
      />
      <Toggle
        id="waiting-room-auto-activate"
        label="Kích hoạt tự động"
        checked={draft.autoActivate}
        onChange={(autoActivate) => updateDraft('autoActivate', autoActivate)}
        disabled={saveMutation.isPending || overrideMutation.isPending}
      />

      <div>
        <p className="mb-2 font-label text-label-sm uppercase tracking-wider text-on-surface-variant">Trạng thái vận hành</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Trạng thái vận hành">
          {overrideOptions.map((option) => {
            const selected = draft.manualOverride === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={saveMutation.isPending || overrideMutation.isPending}
                onClick={() => updateDraft('manualOverride', option.value)}
                className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
                  selected ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 text-on-surface-variant hover:border-white/25'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {numberFields.map(({ field, id, label, suffix, min }) => (
          <Input
            key={field}
            id={id}
            type="number"
            min={min}
            step="1"
            inputMode="numeric"
            label={label}
            value={draft[field]}
            error={errors[field]}
            suffix={<span className="text-xs text-on-surface-variant">{suffix}</span>}
            onKeyDown={preventParentSubmit}
            onChange={(event) => updateDraft(field, event.target.value)}
            disabled={saveMutation.isPending || overrideMutation.isPending}
          />
        ))}
      </div>

      {lowConcurrency && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200" role="status">
          Giới hạn này rất thấp và có thể khiến người dùng chờ lâu. Chỉ nên dùng cho demo hoặc kiểm thử.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <Button type="button" onClick={handleSave} loading={saveMutation.isPending} disabled={overrideMutation.isPending}>
          Lưu cấu hình
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => handleOverride('FORCE_ON')} disabled={quickActionsDisabled}>
            Bật ngay
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={() => handleOverride('FORCE_OFF')} disabled={quickActionsDisabled}>
            Tắt ngay
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => handleOverride('NONE')} disabled={quickActionsDisabled}>
            Trả về tự động
          </Button>
        </div>
      </div>

      {!hasConfig ? (
        <p className="text-xs text-on-surface-variant">Hãy lưu cấu hình lần đầu để sử dụng thao tác nhanh.</p>
      ) : persisted?.enabled !== true ? (
        <p className="text-xs text-on-surface-variant">Bật và lưu phòng chờ trước khi thay đổi trạng thái vận hành.</p>
      ) : null}
    </div>
  );
}
