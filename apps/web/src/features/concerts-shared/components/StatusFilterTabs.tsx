import React from 'react';
import type { ConcertStatus } from '../types';
import { cn } from '../../../shared/ui/cn';

interface StatusFilterTabsProps {
  selectedStatus: ConcertStatus | 'ALL';
  onStatusChange: (status: ConcertStatus | 'ALL') => void;
  counts: Record<ConcertStatus | 'ALL', number>;
}

const TABS: { value: ConcertStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ENDED', label: 'Ended' },
];

export function StatusFilterTabs({ selectedStatus, onStatusChange, counts }: StatusFilterTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b border-white/10 px-2" role="tablist">
      {TABS.map((tab) => {
        const isActive = selectedStatus === tab.value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onStatusChange(tab.value)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all rounded-t-lg focus-visible:outline-none',
              isActive
                ? 'text-white bg-white/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider',
                isActive
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
                  : 'bg-white/10 text-slate-300 group-hover:bg-white/20',
              )}
            >
              {counts[tab.value]}
            </span>

            {/* Gradient underline — only on active */}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-secondary shadow-[0_0_8px_rgba(219,77,245,0.5)]"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
