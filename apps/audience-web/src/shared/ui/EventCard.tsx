import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Music2, Ticket } from 'lucide-react';
import type { PublicConcertSummary } from '@ticketbox/api-types';
import { cn } from './cn';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardFooter } from '../../components/ui/card';

interface EventCardProps {
  concert: PublicConcertSummary;
  className?: string;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatPrice(vnd: number | null): string {
  if (vnd === null) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vnd);
}

export function EventCard({ concert, className }: EventCardProps) {
  const [imgError, setImgError] = useState(false);
  const { slug, title, artistName, venueName, city, startsAt, posterAsset, availabilitySummary } =
    concert;
  const isSoldOut = availabilitySummary.totalAvailableQuantity === 0;

  return (
    <Link
      to={`/events/${slug}`}
      className={cn(
        'group block h-full rounded-3xl no-underline outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={`Xem chi tiết ${title}`}
    >
      <Card className="h-full gap-0 overflow-hidden border-white/70 bg-card/85 py-0 shadow-[0_18px_55px_rgb(15_23_42/0.08)] backdrop-blur transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_26px_70px_rgb(37_99_235/0.16)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {posterAsset?.publicUrl && !imgError ? (
            <img
              src={resolveImageUrl(posterAsset.publicUrl)}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,oklch(0.88_0.14_220),transparent_16rem),linear-gradient(135deg,oklch(0.5_0.2_260),oklch(0.74_0.18_240))] text-5xl text-white">
              🎵
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge className={cn('rounded-full px-3 py-1 shadow-lg', isSoldOut ? 'bg-destructive text-white' : 'bg-white/90 text-foreground backdrop-blur')}>
              {isSoldOut ? 'Hết vé' : `${availabilitySummary.totalAvailableQuantity} vé`}
            </Badge>
            {availabilitySummary.minPriceVnd !== null && (
              <Badge className="rounded-full bg-primary px-3 py-1 text-primary-foreground shadow-lg">
                Từ {formatPrice(availabilitySummary.minPriceVnd)}
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Music2 className="size-3.5" aria-hidden="true" />
              {artistName}
            </p>
            <h3 className="line-clamp-2 text-xl font-black leading-tight tracking-tight text-foreground">
              {title}
            </h3>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" aria-hidden="true" />
              {formatDate(startsAt)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" aria-hidden="true" />
              <span className="line-clamp-1">
                {venueName} · {city}
              </span>
            </p>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/35 p-5">
          <Button asChild className="h-10 w-full rounded-full shadow-lg shadow-primary/15" tabIndex={-1}>
            <span>
              <Ticket className="size-4" aria-hidden="true" />
              Xem vé
            </span>
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
