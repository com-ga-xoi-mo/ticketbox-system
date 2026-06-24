import React from 'react';
import type { Concert } from '../types';
import { mapStatus } from '../status';
import { Badge } from '../../../shared/ui/badge';
import { cn } from '../../../shared/ui/cn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/ui/table';

import { getAssetUrl } from '../../../shared/api/client';

interface ConcertTableProps {
  concerts: Concert[];
  onSelect?: (concert: Concert) => void;
  selectedId?: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

export function ConcertTable({ concerts, onSelect, selectedId }: ConcertTableProps) {
  const formatDateTime = (dateStr: string) => {
    return dateFormatter.format(new Date(dateStr));
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (Math.abs(diffMins) < 60) return relativeTimeFormatter.format(diffMins, 'minute');
    if (Math.abs(diffHours) < 24) return relativeTimeFormatter.format(diffHours, 'hour');
    return relativeTimeFormatter.format(diffDays, 'day');
  };

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[680px]">
        <TableHeader>
          <TableRow className="border-b border-white/5 bg-surface-container-high/20">
            {[
              { label: 'Concert & Artist', cls: 'pl-6 w-[35%]' },
              { label: 'Venue & City', cls: 'w-[25%]' },
              { label: 'Schedule', cls: 'w-[20%]' },
              { label: 'Status', cls: 'w-[10%]' },
              { label: 'Updated', cls: 'w-[10%]' },
              { label: '', cls: 'pr-6 w-8' },
            ].map(({ label, cls = '' }) => (
              <TableHead key={label || 'action'} className={cls}>
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {concerts.map((concert) => {
            const { label, variant, dotClass } = mapStatus(concert.status);
            const isCancelled = concert.status === 'CANCELLED';
            const isSelected = selectedId === concert.id;
            const imageUrl = concert.posterAssetId
              ? getAssetUrl(concert.posterAssetId)
              : null;

            return (
              <TableRow
                key={concert.id}
                className={cn(
                  'group cursor-pointer border-l-2 transition-all duration-150 hover:bg-white/[0.04]',
                  isSelected
                    ? 'border-l-primary bg-primary/5'
                    : 'border-l-transparent hover:border-l-primary/30',
                )}
                onClick={() => onSelect?.(concert)}
              >
                {/* Concert & Artist */}
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5 font-display text-base font-bold text-on-surface-variant transition-colors',
                        isSelected && 'border-primary/30',
                        isCancelled && 'opacity-40',
                      )}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={concert.title}
                          width={52}
                          height={52}
                          loading="lazy"
                          className="size-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        concert.title.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          'block truncate text-sm font-bold leading-normal py-[1px] text-on-surface transition-colors',
                          isSelected ? 'text-primary' : 'group-hover:text-primary',
                          isCancelled && 'line-through opacity-50 decoration-on-surface-variant/40',
                        )}
                      >
                        {concert.title}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-on-surface-variant">
                        {concert.artistName}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Venue & City */}
                <TableCell>
                  <div
                    className={cn(
                      'max-w-[14rem] truncate text-sm text-on-surface',
                      isCancelled && 'opacity-50',
                    )}
                  >
                    {concert.venueName}
                  </div>
                  <div className="mt-0.5 max-w-[14rem] truncate text-xs text-on-surface-variant">
                    {concert.city}
                  </div>
                </TableCell>

                {/* Schedule */}
                <TableCell>
                  <div
                    className={cn(
                      'text-[13px] font-medium text-on-surface',
                      isCancelled && 'opacity-50',
                    )}
                  >
                    {new Date(concert.startsAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className={cn(
                    'mt-0.5 font-mono text-[11px] text-on-surface-variant flex items-center gap-1.5',
                    isCancelled && 'opacity-50'
                  )}>
                    <span>
                      {new Date(concert.startsAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      }) + ' ICT'}
                    </span>
                    {(() => {
                      if (!concert.startsAt || !concert.endsAt) return null;
                      const diffMs = new Date(concert.endsAt).getTime() - new Date(concert.startsAt).getTime();
                      if (diffMs <= 0 || isNaN(diffMs)) return null;
                      const diffMins = Math.floor(diffMs / 60000);
                      const h = Math.floor(diffMins / 60);
                      const m = diffMins % 60;
                      let duration = '';
                      if (h > 0 && m > 0) duration = `${h}h ${m}m`;
                      else if (h > 0) duration = `${h}h`;
                      else duration = `${m}m`;
                      return <span className="opacity-70">({duration})</span>;
                    })()}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={variant}>
                    {dotClass && <span className={`size-1.5 rounded-full ${dotClass}`} />}
                    {label}
                  </Badge>
                </TableCell>

                {/* Updated */}
                <TableCell>
                  <span className="font-mono text-xs tabular-nums text-on-surface-variant">
                    {formatRelativeTime(concert.updatedAt)}
                  </span>
                </TableCell>

                {/* Chevron */}
                <TableCell className="pr-6 text-right">
                  <span
                    className={cn(
                      'material-symbols-outlined text-[18px] transition-all duration-150',
                      isSelected
                        ? 'text-primary opacity-100'
                        : 'text-on-surface-variant opacity-0 group-hover:translate-x-0.5 group-hover:opacity-70',
                    )}
                  >
                    chevron_right
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
