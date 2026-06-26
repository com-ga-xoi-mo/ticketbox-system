import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Minus, Plus, ShieldCheck, Ticket, UserRound, Map as MapIcon } from 'lucide-react';
import { fetchConcertDetail, catalogKeys } from '../../shared/api/catalog';
import { useRequireAuth } from '../../shared/hooks/useRequireAuth';
import { generateIdempotencyKey } from '../../shared/lib/idempotency';
import { PageLoading, PageError, PageUnavailable, PageSoldOut } from '../../shared/ui/PageStates';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { FavoriteButton } from '../../shared/ui/FavoriteButton';
import { VenueMapModal } from './components/VenueMapModal';
import { getVenueCoordinates } from './utils/venue-coordinates';
import { SeoHead } from '../../shared/ui/seo/SeoHead';
import { EVENT_TYPE_LABELS } from '../../shared/utils/event-types';
import type { PublicTicketType, PublicConcertDetailResponse } from '@ticketbox/api-types';

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

function getSaleWindowState(ticketType: PublicTicketType, now: Date = new Date()): 'upcoming' | 'on-sale' | 'ended' | 'paused' | 'sold-out' {
  if (ticketType.status === 'SOLD_OUT' || ticketType.availableQuantity === 0) return 'sold-out';
  if (ticketType.status === 'PAUSED') return 'paused';
  if (ticketType.status === 'ARCHIVED') return 'ended';

  const start = new Date(ticketType.saleStartsAt);
  const end = new Date(ticketType.saleEndsAt);

  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'on-sale';
}

function calculateZoneAvailability(zoneId: string, data: PublicConcertDetailResponse): number {
  const mappedTicketTypeIds = data.ticketTypeZoneMappings
    .filter(m => m.seatingZoneId === zoneId)
    .map(m => m.ticketTypeId);
  
  if (mappedTicketTypeIds.length === 0) return 0;
  
  return data.ticketTypes
    .filter(tt => mappedTicketTypeIds.includes(tt.id))
    .reduce((sum, tt) => sum + tt.availableQuantity, 0);
}

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, redirectToLogin } = useRequireAuth();
  const [posterError, setPosterError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [quantities, setQuantities] = useState<Map<string, number>>(new Map());
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setPosterError(false);
    setMapError(false);
    setQuantities(new Map());
  }, [slug]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: catalogKeys.detail(slug ?? ''),
    queryFn: () => fetchConcertDetail(slug ?? ''),
    enabled: Boolean(slug),
    retry: false, // Don't retry on 404
  });

  if (isLoading) return <PageLoading />;
  
  if (isError) {
    const err = error as any;
    if (err?.response?.status === 404 || err?.status === 404) {
      return <PageUnavailable />;
    }
    return <PageError message="Không thể tải thông tin sự kiện." />;
  }

  if (!data) return <PageUnavailable />;

  const isAllSoldOut = data.ticketTypes.length > 0 && data.ticketTypes.every(tt => tt.availableQuantity === 0 || tt.status === 'SOLD_OUT');
  
  const handleQuantityChange = (ticketTypeId: string, delta: number, maxPerUser: number, availableQuantity: number) => {
    setQuantities(prev => {
      const current = prev.get(ticketTypeId) || 0;
      const next = current + delta;
      
      if (next < 0) return prev;
      if (next > maxPerUser) return prev;
      if (next > availableQuantity) return prev;
      
      const newMap = new Map(prev);
      newMap.set(ticketTypeId, next);
      return newMap;
    });
  };

  const hasSelectedTickets = Array.from(quantities.values()).some(qty => qty > 0);

  const handleCheckout = () => {
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    const selectedQuantities = Array.from(quantities.entries()).filter(([, quantity]) => quantity > 0);
    navigate('/checkout', {
      state: {
        concertId: data.id,
        concertSlug: data.slug,
        concertTitle: data.title,
        quantities: selectedQuantities,
        idempotencyKey: generateIdempotencyKey(),
      },
    });
  };

  const seoTitle = data.seoTitle || `${data.title} | Ticketbox`;
  const seoDescription = data.seoDescription || (data.description ? data.description.substring(0, 160) : undefined);
  const seoImageUrl = data.seoImageUrl || resolveImageUrl(data.posterAsset?.publicUrl || undefined);
  const eventUrl = typeof window !== 'undefined' ? window.location.href : undefined;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        imageUrl={seoImageUrl}
        url={eventUrl}
        type="event"
      />
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28 lg:self-start space-y-6">
          {data.posterAsset?.publicUrl && !posterError ? (
            <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-card shadow-[0_28px_80px_rgb(15_23_42/0.18)]">
              <img
                src={resolveImageUrl(data.posterAsset.publicUrl)}
                alt={data.title}
                className="aspect-[4/5] w-full object-cover"
                onError={() => setPosterError(true)}
              />
            </div>
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#2563EB,#06B6D4)] text-7xl text-white shadow-[0_28px_80px_rgb(37_99_235/0.18)]">
              🎵
            </div>
          )}

          {data.seatingMapAsset?.publicUrl && !mapError && (
            <Card className="overflow-hidden border-white/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapIcon className="size-4 text-primary" />
                  Sơ đồ sự kiện
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <img 
                  src={resolveImageUrl(data.seatingMapAsset.publicUrl)} 
                  alt="Sơ đồ sự kiện" 
                  className="w-full object-contain"
                  onError={() => setMapError(true)}
                />
              </CardContent>
            </Card>
          )}

          {data.seatingZones && data.seatingZones.length > 0 && (
            <Card className="border-white/70 bg-card/80 shadow-sm backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Khu vực ghế</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                  {data.seatingZones.map(zone => {
                    const available = calculateZoneAvailability(zone.id, data);
                    return (
                      <div key={zone.id} className="flex items-center gap-2 text-sm">
                        <div 
                          className="size-3 shrink-0 rounded-full border border-black/10" 
                          style={{ backgroundColor: zone.color || '#ccc' }} 
                        />
                        <span className="truncate flex-1" title={zone.label}>{zone.label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {available > 0 ? `(${available})` : '(Hết)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wider">
                {EVENT_TYPE_LABELS[data.eventType] || data.eventType}
              </Badge>
              <Badge className="rounded-full bg-primary/10 px-4 py-1.5 text-primary">
                {data.artistName}
              </Badge>
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
              {data.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <FavoriteButton concertId={data.id} className="rounded-full px-6 shadow-sm" />
            </div>
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
                  <button
                    onClick={() => setShowMap(true)}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    <MapIcon className="size-3" />
                    Xem bản đồ
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {data.description && (
            <p className="text-base leading-8 text-muted-foreground whitespace-pre-wrap">{data.description}</p>
          )}

          {data.publishedArtistBio && (
            <Card className="border-white/70 bg-card/50 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3 font-semibold text-foreground">
                  <UserRound className="size-4 text-primary" />
                  Về nghệ sĩ
                </div>
                <div className="text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                  {data.publishedArtistBio}
                </div>
              </CardContent>
            </Card>
          )}

          {isAllSoldOut && <PageSoldOut />}

          {data.ticketTypes.length > 0 && (
            <Card className="border-white/70 bg-card/90 shadow-[0_22px_60px_rgb(15_23_42/0.1)] backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-black">
                  <Ticket className="size-5 text-primary" aria-hidden="true" />
                  Chọn loại vé
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0">
                {data.ticketTypes.map((tt) => {
                  const state = getSaleWindowState(tt);
                  const isActive = state === 'on-sale';
                  const currentQty = quantities.get(tt.id) || 0;
                  
                  return (
                    <div
                      key={tt.id}
                      className={`group rounded-3xl border border-border/80 bg-white/60 p-4 transition-all hover:border-primary/35 hover:bg-white/90 hover:shadow-lg ${!isActive ? 'opacity-70' : ''}`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-lg font-bold text-foreground">{tt.name}</p>
                          {tt.description && (
                            <p className="mt-1 text-sm text-muted-foreground">{tt.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-muted-foreground">
                              Còn {tt.availableQuantity} / {tt.totalQuantity} vé · Tối đa {tt.maxPerUser} vé/người
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 sm:justify-end sm:flex-col sm:items-end">
                          <div className="text-right flex flex-col items-end">
                            <p className="text-xl font-black text-primary">{formatPrice(tt.priceVnd)}</p>
                            
                            {state === 'upcoming' && <Badge variant="secondary" className="mt-1">Mở bán: {formatDate(tt.saleStartsAt)}</Badge>}
                            {state === 'ended' && <Badge variant="secondary" className="mt-1">Đã kết thúc</Badge>}
                            {state === 'paused' && <Badge variant="secondary" className="mt-1">Tạm dừng</Badge>}
                            {state === 'sold-out' && <Badge variant="destructive" className="mt-1">Hết vé</Badge>}
                            {state === 'on-sale' && <Badge className="mt-1 bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">Đang mở bán</Badge>}
                            
                          </div>
                          <div className="flex items-center rounded-full border bg-background/80 p-1">
                            <Button 
                              variant="ghost" 
                              size="icon-sm" 
                              aria-label={`Giảm số lượng vé ${tt.name}`}
                              disabled={!isActive || currentQty === 0}
                              onClick={() => handleQuantityChange(tt.id, -1, tt.maxPerUser, tt.availableQuantity)}
                            >
                              <Minus className="size-3.5" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">{currentQty}</span>
                            <Button 
                              variant="ghost" 
                              size="icon-sm" 
                              aria-label={`Tăng số lượng vé ${tt.name}`}
                              disabled={!isActive || currentQty >= tt.maxPerUser || currentQty >= tt.availableQuantity}
                              onClick={() => handleQuantityChange(tt.id, 1, tt.maxPerUser, tt.availableQuantity)}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Separator />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                    Vé được xác thực và giữ chỗ an toàn.
                  </div>
                  <Button 
                    className="h-11 rounded-full px-7 shadow-xl shadow-primary/20"
                    disabled={!hasSelectedTickets}
                    onClick={handleCheckout}
                  >
                    Tiếp tục mua vé
                    <Ticket className="ml-2 size-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* Venue Map Modal */}
      {(() => {
        const coords = getVenueCoordinates(data.venueName);
        return (
          <VenueMapModal
            latitude={coords.latitude}
            longitude={coords.longitude}
            venueName={data.venueName}
            address={data.venueAddress ?? undefined}
            open={showMap}
            onClose={() => setShowMap(false)}
          />
        );
      })()}
    </div>
  );
}
