import { Link } from 'react-router-dom';
import { MOCK_STATS } from './mock-data';
import { QuickActions } from './QuickActions';
import { RecentConcertsTable } from './RecentConcertsTable';

const ACTIVITY_POINTS = [42, 48, 46, 58, 63, 61, 70, 76, 81, 79, 86, 91];

const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function ActivityLine() {
  const width = 320;
  const height = 104;
  const min = Math.min(...ACTIVITY_POINTS);
  const max = Math.max(...ACTIVITY_POINTS);
  const points = ACTIVITY_POINTS.map((value, index) => {
    const x = (index / (ACTIVITY_POINTS.length - 1)) * width;
    const y = height - ((value - min) / (max - min)) * (height - 18) - 9;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-28 w-full text-primary"
      role="img"
      aria-label="Concert approval activity increased over the last twelve checkpoints"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`${points} ${width},${height} 0,${height}`}
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  );
}

function StatusBar() {
  const s = MOCK_STATS;
  const segments = [
    { label: 'Published', value: s.published, className: 'bg-primary' },
    { label: 'Draft', value: s.drafts, className: 'bg-on-surface-variant' },
    { label: 'Ended', value: s.ended, className: 'bg-tertiary' },
    { label: 'Cancelled', value: s.cancelled, className: 'bg-error' },
  ];
  const total = segments.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 overflow-hidden rounded-md bg-surface-container-highest">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label}: ${segment.value}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((segment) => (
          <div key={segment.label} className="rounded-lg bg-surface-container-high/50 p-3">
            <p className="font-mono text-[11px] text-on-surface-variant">{segment.label}</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-on-surface">
              {segment.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <article className="glass-card flex min-h-32 flex-col justify-between rounded-lg p-5 transition-colors duration-200 hover:border-white/15">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-on-surface-variant">{label}</p>
        <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div>
        <p className="font-display text-3xl font-bold leading-none tabular-nums text-on-surface">
          {value}
        </p>
        <p className="mt-2 text-sm leading-5 text-on-surface-variant">{detail}</p>
      </div>
    </article>
  );
}

export function OrganizerDashboard() {
  const s = MOCK_STATS;
  const moderationLoad = Math.round((s.reviewQueue / s.totalConcerts) * 100);

  return (
    <main className="min-h-[100dvh] overflow-x-hidden px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-[86rem] flex-col gap-8">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-medium text-on-surface-variant">TicketBox admin</p>
            <h1 className="mt-3 text-pretty font-display text-4xl font-extrabold leading-tight text-on-surface md:text-5xl">
              Operations dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-on-surface-variant">
              Track concert moderation, inventory pressure, and staff readiness across the
              management console.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-surface-container/80 px-4 py-3 text-sm text-on-surface-variant">
            <span className="size-2 rounded-sm bg-tertiary" aria-hidden="true" />
            <span className="font-medium">Live queue</span>
            <span className="font-mono tabular-nums text-on-surface">
              {numberFormatter.format(s.reviewQueue)}
            </span>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.85fr)]">
          <article className="glass-panel overflow-hidden rounded-xl">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="flex flex-col gap-8 p-6 md:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-xs text-on-surface-variant">approval activity</p>
                    <h2 className="mt-2 font-display text-2xl font-bold text-on-surface">
                      Concerts are moving through review
                    </h2>
                  </div>
                  <Link
                    to="/concerts"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-semibold text-on-surface transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Open Concerts
                  </Link>
                </div>
                <ActivityLine />
                <StatusBar />
              </div>

              <aside className="border-t border-white/5 bg-surface-container-low/70 p-6 lg:border-l lg:border-t-0">
                <p className="font-mono text-xs text-on-surface-variant">moderation load</p>
                <p className="mt-4 font-display text-5xl font-extrabold leading-none tabular-nums text-on-surface">
                  {moderationLoad}%
                </p>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  {s.reviewQueue} concerts need admin review before publishing.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <div className="flex items-center justify-between rounded-lg bg-surface-container-high/50 p-3">
                    <span className="text-sm text-on-surface-variant">Staff assigned</span>
                    <span className="font-mono tabular-nums text-on-surface">
                      {s.staffAssigned}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-surface-container-high/50 p-3">
                    <span className="text-sm text-on-surface-variant">Check-in readiness</span>
                    <span className="font-mono tabular-nums text-on-surface">{s.checkinRate}%</span>
                  </div>
                </div>
              </aside>
            </div>
          </article>

          <QuickActions />
        </section>

        <section className="grid gap-6 lg:grid-cols-4">
          <MetricCard
            label="Total concerts"
            value={numberFormatter.format(s.totalConcerts)}
            detail={`${s.totalTrend} compared with the previous month`}
            icon="queue_music"
          />
          <MetricCard
            label="Published"
            value={numberFormatter.format(s.published)}
            detail={`${s.drafts} drafts still need organizer updates`}
            icon="published_with_changes"
          />
          <MetricCard
            label="Available inventory"
            value={compactFormatter.format(s.ticketsAvailable)}
            detail={`${s.soldOutRate}% of ${compactFormatter.format(s.ticketsTotal)} tickets allocated`}
            icon="confirmation_number"
          />
          <MetricCard
            label="Staff coverage"
            value={`${s.checkinRate}%`}
            detail={`${s.staffAssigned} check-in staff assigned to active events`}
            icon="badge"
          />
        </section>

        <section>
          <RecentConcertsTable />
        </section>
      </div>
    </main>
  );
}
