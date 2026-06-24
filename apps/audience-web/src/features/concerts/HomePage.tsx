import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Music2, Search, Ticket } from 'lucide-react';
import { useConcertList, useConcertCities } from '../../shared/api/catalog';
import { EventCard } from '../../shared/ui/EventCard';
import { PageLoading, PageError } from '../../shared/ui/PageStates';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';

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

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [heroImgError, setHeroImgError] = useState(false);

  const { data: concerts, isLoading, isError } = useConcertList();
  const { data: cities = [] } = useConcertCities();

  const featuredConcert = concerts && concerts.length > 0 ? concerts[0] : null;

  useEffect(() => {
    setHeroImgError(false);
  }, [featuredConcert?.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/events');
    }
  };

  const filteredConcerts = concerts
    ? selectedCity === 'All'
      ? concerts
      : concerts.filter((c) => c.city === selectedCity)
    : [];

  return (
    <div className="relative">
      <section className="relative overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,oklch(0.82_0.18_260/0.35),transparent_26rem),radial-gradient(circle_at_80%_20%,oklch(0.9_0.18_220/0.28),transparent_24rem)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="py-10 lg:py-20">
            <Badge className="mb-5 rounded-full bg-white/80 px-4 py-1.5 text-primary shadow-sm backdrop-blur">
              <Ticket className="mr-2 size-3.5" aria-hidden="true" />
              Khám phá sự kiện live
            </Badge>
            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
              Săn vé sự kiện đỉnh cao cùng TicketBox.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Khám phá concert, festival và trải nghiệm live được tuyển chọn với hệ thống đặt vé mượt mà và an toàn.
            </p>
            
            <form onSubmit={handleSearch} className="mt-8 flex w-full max-w-md items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm tên sự kiện hoặc nghệ sĩ..."
                  className="h-12 rounded-full bg-white/80 pl-10 pr-4 shadow-sm backdrop-blur"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-12 rounded-full px-7 shadow-xl shadow-primary/20">
                Tìm kiếm
              </Button>
            </form>
          </div>

          {isLoading ? (
            <div className="relative min-h-[460px] animate-pulse rounded-3xl bg-muted" />
          ) : featuredConcert ? (
            <Card className="relative min-h-[460px] overflow-hidden border-white/70 bg-black py-0 text-white shadow-[0_35px_90px_rgb(37_99_235/0.28)]">
              {featuredConcert.posterAsset?.publicUrl && !heroImgError ? (
                <img
                  src={resolveImageUrl(featuredConcert.posterAsset.publicUrl)}
                  alt={featuredConcert.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay"
                  onError={() => setHeroImgError(true)}
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
                    {featuredConcert.city}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.1em] text-white/80">
                    <Music2 className="inline mr-2 size-4" />
                    {featuredConcert.artistName}
                  </p>
                  <h2 className="mt-2 text-4xl font-black leading-tight tracking-tight text-white drop-shadow-md">
                    {featuredConcert.title}
                  </h2>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-medium text-white/90">
                    <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur">
                      <CalendarDays className="size-4" />
                      {formatDate(featuredConcert.startsAt)}
                    </span>
                    <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur">
                      <MapPin className="size-4" />
                      {featuredConcert.venueName}
                    </span>
                  </div>
                  <Button asChild className="mt-6 rounded-full px-8 bg-white text-black hover:bg-white/90">
                    <Link to={`/events/${featuredConcert.slug}`}>
                      Xem chi tiết <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="relative flex min-h-[460px] items-center justify-center overflow-hidden border-white/70 bg-[radial-gradient(circle_at_35%_15%,rgba(6,182,212,0.85),transparent_12rem),linear-gradient(140deg,#2563EB,#1D4ED8_48%,#0F172A)] py-0 text-white shadow-[0_35px_90px_rgb(37_99_235/0.28)]">
              <CardContent className="text-center p-8">
                <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-white/10 text-4xl backdrop-blur">
                  🎟️
                </div>
                <h2 className="text-2xl font-bold">Nhiều sự kiện sắp ra mắt</h2>
                <p className="mt-2 text-white/80">Hãy quay lại sau để không bỏ lỡ các concert đỉnh cao.</p>
                <Button asChild variant="outline" className="mt-6 rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur">
                  <Link to="/events">Xem tất cả sự kiện</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Sự kiện nổi bật</h2>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-white/70">
            <Link to="/events">
              Xem tất cả
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {!isLoading && !isError && cities.length > 1 && (
          <Tabs value={selectedCity} onValueChange={setSelectedCity} className="mb-8">
            <TabsList className="bg-muted/50 rounded-full p-1 overflow-x-auto inline-flex max-w-full hide-scrollbar">
              <TabsTrigger value="All" className="rounded-full px-6">Tất cả</TabsTrigger>
              {cities.map((city) => (
                <TabsTrigger key={city} value={city} className="rounded-full px-6">
                  {city}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {isLoading && <PageLoading />}
        {isError && <PageError message="Không thể tải sự kiện. Vui lòng thử lại." />}
        {filteredConcerts && filteredConcerts.length > 0 && (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredConcerts.slice(0, 6).map((concert) => (
              <EventCard key={concert.id} concert={concert} />
            ))}
          </div>
        )}
        {!isLoading && !isError && filteredConcerts && filteredConcerts.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Không có sự kiện nào đang diễn ra tại thành phố này.
          </div>
        )}
      </section>
    </div>
  );
}
