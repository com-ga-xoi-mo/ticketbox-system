import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TicketSummaryResponse } from '@ticketbox/api-types';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { cn } from '../../../lib/utils';

interface MyTicketCalendarProps {
  tickets: TicketSummaryResponse[];
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialMonth(tickets: TicketSummaryResponse[]): Date {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const ticketDates = tickets
    .map((ticket) => toDate(ticket.concertStartsAt))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  const relevantDate =
    ticketDates.find((date) => date.getTime() >= startOfToday.getTime()) ??
    ticketDates.at(-1) ??
    today;

  return new Date(relevantDate.getFullYear(), relevantDate.getMonth(), 1);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatEventTime(value: string | Date): string {
  const date = toDate(value);
  if (!date) return 'Thời gian chưa xác định';

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function MyTicketCalendar({ tickets }: MyTicketCalendarProps) {
  const navigate = useNavigate();
  const [visibleMonth, setVisibleMonth] = useState(() => getInitialMonth(tickets));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const ticketsByDate = useMemo(() => {
    const grouped = new Map<string, TicketSummaryResponse[]>();

    for (const ticket of tickets) {
      const date = toDate(ticket.concertStartsAt);
      if (!date) continue;

      const key = toLocalDateKey(date);
      const ticketsOnDate = grouped.get(key) ?? [];
      ticketsOnDate.push(ticket);
      grouped.set(key, ticketsOnDate);
    }

    return grouped;
  }, [tickets]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayBasedOffset = (new Date(year, month, 1).getDay() + 6) % 7;

    return [
      ...Array.from({ length: mondayBasedOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const date = new Date(year, month, index + 1);
        return {
          key: toLocalDateKey(date),
          dayNumber: index + 1,
        };
      }),
    ];
  }, [visibleMonth]);

  const selectedTickets = selectedDateKey
    ? ticketsByDate.get(selectedDateKey) ?? []
    : [];

  const changeMonth = (offset: number) => {
    setVisibleMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
    setSelectedDateKey(null);
  };

  const handleDayClick = (dateKey: string) => {
    const ticketsOnDate = ticketsByDate.get(dateKey) ?? [];

    if (ticketsOnDate.length === 1) {
      navigate(`/account/tickets/${ticketsOnDate[0].id}`);
      return;
    }

    setSelectedDateKey(ticketsOnDate.length > 1 ? dateKey : null);
  };

  return (
    <Card aria-label="Lịch vé của tôi">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Lịch vé của tôi
        </CardTitle>
        <CardDescription>
          Chọn ngày có đánh dấu để mở vé của sự kiện.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tháng trước"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft />
          </Button>
          <h2 className="text-base font-semibold capitalize">{formatMonth(visibleMonth)}</h2>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Tháng sau"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="py-2 text-xs font-semibold text-muted-foreground"
              aria-hidden="true"
            >
              {weekday}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} aria-hidden="true" />;
            }

            const ticketsOnDate = ticketsByDate.get(day.key) ?? [];
            const hasTickets = ticketsOnDate.length > 0;
            const isSelected = selectedDateKey === day.key;

            return (
              <button
                key={day.key}
                type="button"
                aria-label={`${day.dayNumber}/${visibleMonth.getMonth() + 1}/${visibleMonth.getFullYear()}, ${
                  hasTickets ? `${ticketsOnDate.length} vé` : 'không có vé'
                }`}
                aria-pressed={isSelected}
                disabled={!hasTickets}
                onClick={() => handleDayClick(day.key)}
                className={cn(
                  'relative flex aspect-square min-h-10 items-center justify-center rounded-lg text-sm transition-colors',
                  hasTickets
                    ? 'bg-primary/10 font-semibold text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                    : 'cursor-default text-muted-foreground',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {day.dayNumber}
                {hasTickets && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary',
                      isSelected && 'bg-primary-foreground',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {selectedTickets.length > 1 && (
          <div className="mt-5 border-t pt-4" aria-label="Các vé trong ngày đã chọn">
            <p className="mb-3 text-sm font-semibold">
              Có {selectedTickets.length} vé trong ngày này
            </p>
            <div className="space-y-2">
              {selectedTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => navigate(`/account/tickets/${ticket.id}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ticket.concertTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.ticketTypeName} · {ticket.ticketNumber}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatEventTime(ticket.concertStartsAt)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
