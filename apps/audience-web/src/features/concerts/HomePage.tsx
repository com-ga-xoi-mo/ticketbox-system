import { Link } from 'react-router-dom';
import { ArrowRight, CalendarHeart, ShieldCheck, Sparkles, Ticket } from 'lucide-react';
import { useConcertList } from '../../shared/api/catalog';
import { EventCard } from '../../shared/ui/EventCard';
import { PageLoading, PageError } from '../../shared/ui/PageStates';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function HomePage() {
  const { data, isLoading, isError } = useConcertList();

  return (
    <div className="relative">
      <section className="relative overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,oklch(0.82_0.18_260/0.35),transparent_26rem),radial-gradient(circle_at_80%_20%,oklch(0.9_0.18_220/0.28),transparent_24rem)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="py-10 lg:py-20">
            <Badge className="mb-5 rounded-full bg-white/80 px-4 py-1.5 text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Marketplace vé live premium
            </Badge>
            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
              Săn vé sự kiện đẹp như một cú encore.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Khám phá concert, festival và trải nghiệm live được tuyển chọn với giao diện mua vé rõ ràng, nhanh và đáng tin cậy.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-full px-7 text-base shadow-xl shadow-primary/20">
                <Link to="/events">
                  Khám phá sự kiện
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/70 bg-white/70 px-7 text-base backdrop-blur">
                <Link to="/account">Vé của tôi</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {[
                ['Giao diện rõ ràng', CalendarHeart],
                ['Vé xác thực', ShieldCheck],
                ['Checkout sẵn sàng', Ticket],
              ].map(([label, Icon]) => (
                <div key={label as string} className="flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 backdrop-blur">
                  <Icon className="size-4 text-primary" aria-hidden="true" />
                  {label as string}
                </div>
              ))}
            </div>
          </div>

          <Card className="relative min-h-[460px] overflow-hidden border-white/70 bg-black py-0 text-white shadow-[0_35px_90px_rgb(37_99_235/0.28)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_15%,rgba(6,182,212,0.85),transparent_12rem),linear-gradient(140deg,#2563EB,#1D4ED8_48%,#0F172A)]" />
            <div className="absolute inset-0 bg-[linear-gradient(transparent_0_70%,rgba(0,0,0,0.45)),radial-gradient(circle_at_70%_72%,rgba(255,255,255,0.24),transparent_9rem)]" />
            <CardContent className="relative flex min-h-[460px] flex-col justify-between p-8">
              <div className="flex items-center justify-between">
                <Badge className="rounded-full bg-white/20 px-3 py-1 text-white backdrop-blur">Live now</Badge>
                <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-semibold backdrop-blur">TicketBox.vn style</span>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">Featured drop</p>
                <h2 className="mt-3 max-w-sm text-4xl font-black leading-none tracking-[-0.04em]">
                  Đêm nhạc mùa hè mở bán tuần này
                </h2>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {['Concert', 'Festival', 'Theatre'].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center text-sm font-semibold backdrop-blur">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="outline" className="mb-3 rounded-full bg-white/60">Đang được chú ý</Badge>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Sự kiện nổi bật</h2>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-white/70">
            <Link to="/events">
              Xem tất cả
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {isLoading && <PageLoading />}
        {isError && <PageError message="Không thể tải sự kiện. Vui lòng thử lại." />}
        {data && data.length > 0 && (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {data.slice(0, 6).map((concert) => (
              <EventCard key={concert.id} concert={concert} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
