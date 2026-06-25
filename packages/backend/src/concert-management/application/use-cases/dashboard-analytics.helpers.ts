import type { DailyRevenuePoint } from './dashboard-analytics.types';

export interface RevenueTrendRow {
  date: string;
  revenueVnd: number | bigint | string | null;
  paidOrders: number | bigint | string | null;
}

export function normalizeWindowDays(days: number | undefined): number {
  if (typeof days !== 'number' || !Number.isInteger(days)) {
    return 30;
  }
  return Math.min(Math.max(days, 1), 90);
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

export function getUtcTrendWindow(windowDays: number, now = new Date()) {
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startDate = addUtcDays(todayUtc, -(windowDays - 1));
  const endExclusive = addUtcDays(todayUtc, 1);
  const dates = Array.from({ length: windowDays }, (_, index) =>
    formatUtcDate(addUtcDays(startDate, index)),
  );

  return { startDate, endExclusive, dates };
}

export function fillRevenueTrend(windowDays: number, rows: RevenueTrendRow[]): DailyRevenuePoint[] {
  const { dates } = getUtcTrendWindow(windowDays);
  const rowsByDate = new Map(
    rows.map((row) => [
      row.date,
      {
        date: row.date,
        revenueVnd: toNumber(row.revenueVnd),
        paidOrders: toNumber(row.paidOrders),
      },
    ]),
  );

  return dates.map((date) => rowsByDate.get(date) ?? { date, revenueVnd: 0, paidOrders: 0 });
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
