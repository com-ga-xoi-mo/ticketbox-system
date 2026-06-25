import { EVENT_TYPE_LABELS } from '../../../shared/utils/event-types';
import { cn } from '../../../shared/ui/cn';

interface EventTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function EventTypeFilter({ value, onChange }: EventTypeFilterProps) {
  const options = [
    { value: 'all', label: 'Tất cả' },
    ...Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
  ];

  return (
    <div className="flex w-full overflow-x-auto hide-scrollbar gap-2 pb-2 mb-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors border",
              isActive 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-card text-muted-foreground hover:bg-muted border-border"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
