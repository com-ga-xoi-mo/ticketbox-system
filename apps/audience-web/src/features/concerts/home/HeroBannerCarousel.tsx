import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Music2 } from 'lucide-react';
import { useFeaturedConcerts } from '../../../shared/api/catalog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';

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
  }).format(new Date(iso));
}

export function HeroBannerCarousel() {
  const { data: featuredConcerts = [], isLoading } = useFeaturedConcerts(5);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (featuredConcerts.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % featuredConcerts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredConcerts.length]);

  if (isLoading) {
    return <div className="relative min-h-[460px] animate-pulse rounded-3xl bg-muted" />;
  }

  if (featuredConcerts.length === 0) {
    return (
      <Card className="relative flex min-h-[460px] items-center justify-center overflow-hidden border-white/70 bg-[radial-gradient(circle_at_35%_15%,rgba(6,182,212,0.85),transparent_12rem),linear-gradient(140deg,#2563EB,#1D4ED8_48%,#0F172A)] py-0 text-white shadow-[0_35px_90px_rgb(37_99_235/0.28)]">
        <CardContent className="text-center p-8">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-white/10 text-4xl backdrop-blur">🎟️</div>
          <h2 className="text-2xl font-bold">Nhiều sự kiện sắp ra mắt</h2>
          <p className="mt-2 text-white/80">Hãy quay lại sau để không bỏ lỡ các sự kiện đỉnh cao.</p>
          <Button asChild variant="outline" className="mt-6 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur">
            <Link to="/events">Xem tất cả sự kiện</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const concert = featuredConcerts[activeIndex];
  const imageUrl = resolveImageUrl(concert.bannerAsset?.publicUrl || concert.posterAsset?.publicUrl);

  return (
    <Card className="relative min-h-[460px] overflow-hidden border-white/70 bg-black py-0 text-white shadow-[0_35px_90px_rgb(37_99_235/0.28)]">
      {imageUrl ? (
        <img
          key={concert.id} // force re-render for animation
          src={imageUrl}
          alt={concert.title}
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay animate-in fade-in duration-1000"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_15%,rgba(6,182,212,0.85),transparent_12rem),linear-gradient(140deg,#2563EB,#1D4ED8_48%,#0F172A)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <CardContent className="relative flex min-h-[460px] flex-col justify-between p-8">
        <div className="flex items-center justify-between">
          <Badge className="rounded-full bg-primary px-3 py-1 text-primary-foreground shadow-lg">Đáng chú ý</Badge>
          <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur text-white/90">
            <MapPin className="inline mr-1 size-3" />
            {concert.city}
          </span>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.1em] text-white/80">
            <Music2 className="inline mr-2 size-4" />
            {concert.artistName}
          </p>
          <h2 className="mt-2 text-4xl font-black leading-tight tracking-tight text-white drop-shadow-md">
            {concert.title}
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-medium text-white/90">
            <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur">
              <CalendarDays className="size-4" />
              {formatDate(concert.startsAt)}
            </span>
            <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur">
              <MapPin className="size-4" />
              {concert.venueName}
            </span>
          </div>
          <Button asChild className="mt-6 rounded-full px-8 bg-white text-black hover:bg-white/90">
            <Link to={`/events/${concert.slug}`}>
              Xem chi tiết <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
      {featuredConcerts.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {featuredConcerts.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${idx === activeIndex ? 'w-6 bg-primary' : 'w-2 bg-white/50 hover:bg-white/80'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
