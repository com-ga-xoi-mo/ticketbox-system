import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Minus, Plus, ShieldCheck, Ticket } from 'lucide-react';
import { fetchConcertDetail, catalogKeys } from '../../shared/api/catalog';
import { PageLoading, PageError } from '../../shared/ui/PageStates';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

function resolveImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatPrice(vnd: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(vnd);
}

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: catalogKeys.detail(slug ?? ''),
    queryFn: () => fetchConcertDetail(slug ?? ''),
    enabled: Boolean(slug),
  });

  if (isLoading) return <PageLoading />;
  if (isError || !data) return <PageError message="Không thể tải thông tin sự kiện." />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          {data.posterAsset?.publicUrl ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-card shadow-[0_28px_80px_rgb(15_23_42/0.18)]">
              <img
                src={resolveImageUrl(data.posterAsset.publicUrl)}
                alt={data.title}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#2563EB,#06B6D4)] text-7xl text-white shadow-[0_28px_80px_rgb(37_99_235/0.18)]">
              🎵
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <Badge className="mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
              {data.artistName}
            </Badge>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
              {data.title}
            </h1>
          </div>

          <Card className="border-white/70 bg-card/80 shadow-sm backdrop-blur">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <CalendarDays className="mt-1 size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Thời gian</p>
                  <p className="text-sm leading-6 text-muted-foreground">{formatDate(data.startsAt)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-1 size-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{data.venueName}, {data.city}</p>
                  {data.venueAddress && <p className="text-sm leading-6 text-muted-foreground">{data.venueAddress}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {data.description && (
            <p className="text-base leading-8 text-muted-foreground">{data.description}</p>
          )}

          {data.ticketTypes.length > 0 && (
            <Card className="border-white/70 bg-card/90 shadow-[0_22px_60px_rgb(15_23_42/0.1)] backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <Ticket className="size-5 text-primary" aria-hidden="true" />
                  Chọn loại vé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0">
                {data.ticketTypes.map((tt) => (
                  <div
                    key={tt.id}
                    className="group rounded-3xl border border-border/80 bg-white/60 p-4 transition-all hover:border-primary/35 hover:bg-white/90 hover:shadow-lg"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-lg font-bold text-foreground">{tt.name}</p>
                      {tt.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{tt.description}</p>
                      )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Còn {tt.availableQuantity} / {tt.totalQuantity} vé · Tối đa {tt.maxPerUser} vé/người
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="text-right">
                          <p className="text-xl font-black text-primary">{formatPrice(tt.priceVnd)}</p>
                      {tt.status !== 'ACTIVE' && (
                            <Badge variant={tt.status === 'SOLD_OUT' ? 'destructive' : 'secondary'} className="mt-2">
                          {tt.status === 'SOLD_OUT' ? 'Hết vé' : 'Tạm dừng'}
                            </Badge>
                      )}
                        </div>
                        <div className="flex items-center rounded-full border bg-background/80 p-1">
                          <Button variant="ghost" size="icon-sm" aria-label={`Giảm số lượng vé ${tt.name}`}>
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold">0</span>
                          <Button variant="ghost" size="icon-sm" aria-label={`Tăng số lượng vé ${tt.name}`}>
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                    Vé được xác thực và giữ chỗ an toàn.
                  </div>
                  <Button className="h-11 rounded-full px-7 shadow-xl shadow-primary/20">
                    Tiếp tục mua vé
                    <Ticket className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
