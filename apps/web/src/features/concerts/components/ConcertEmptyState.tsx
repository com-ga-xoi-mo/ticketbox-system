import React from 'react';
import { Button } from '../../../shared/ui/Button';

interface ConcertEmptyStateProps {
  canCreate?: boolean;
  onCreateClick?: () => void;
}

export function ConcertEmptyState({ canCreate = true, onCreateClick }: ConcertEmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden px-4 py-20">
      {/* Atmospheric spotlight — centered radial glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-[480px] rounded-full bg-primary/5 blur-[80px]" />
      </div>

      <div className="glass-card relative z-10 w-full max-w-md overflow-hidden rounded-2xl">
        {/* Stage-light accent at top */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="px-10 py-12 text-center">
          {/* Icon ring — simpler, less generic than triple-animate */}
          <div className="relative mx-auto mb-8 flex size-20 items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5" />
            <div className="absolute inset-3 rounded-full border border-primary/15" />
            <span
              className="relative material-symbols-outlined text-[32px] text-primary"
              aria-hidden="true"
            >
              queue_music
            </span>
          </div>

          <h3 className="mb-3 font-display text-xl font-bold text-on-surface">
            {canCreate ? 'No concerts yet' : 'Nothing to moderate yet'}
          </h3>
          <p className="mx-auto mb-8 max-w-xs text-sm leading-relaxed text-on-surface-variant">
            {canCreate
              ? 'Your upcoming events will appear here. Create your first concert to get started.'
              : 'Concert events created by organizers will appear here once submitted.'}
          </p>

          {canCreate && onCreateClick && (
            <Button onClick={onCreateClick}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                add_circle
              </span>
              Create concert
            </Button>
          )}
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </div>
    </div>
  );
}
