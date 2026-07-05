import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { getMyFavorites } from '../../shared/api/favorites';
import { EventCard } from '../../shared/ui/EventCard';
import { Button } from '../../components/ui/button';
import { SeoHead } from '../../shared/ui/seo/SeoHead';

export function FavoritesPage() {
  const { data: favorites, isLoading, isError } = useQuery({
    queryKey: ['favorites'],
    queryFn: getMyFavorites,
  });

  return (
    <AudienceProtectedRoute>
      <SeoHead title="Sự kiện yêu thích | Ticketbox" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <Heart className="h-8 w-8 text-rose-500" />
          <h1 className="text-3xl font-black tracking-tight">Sự kiện yêu thích</h1>
        </div>

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <p>Có lỗi xảy ra khi tải danh sách yêu thích.</p>
          </div>
        )}

        {favorites?.length === 0 && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-border bg-muted/30 p-8 text-center">
            <div className="mb-4 rounded-full bg-rose-100 p-4">
              <Heart className="h-8 w-8 text-rose-500 opacity-80" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Chưa có sự kiện yêu thích</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Bạn chưa lưu sự kiện nào. Hãy khám phá các sự kiện đang hot và thả tim để lưu lại nhé.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/events">Khám phá sự kiện</Link>
            </Button>
          </div>
        )}

        {favorites && favorites.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {favorites.map((concert) => (
              <div key={concert.id} className="h-full">
                {/* EventCard uses PublicConcertSummary, we adapt FavoriteConcert to it */}
                <EventCard
                  concert={{
                    id: concert.id,
                    title: concert.title,
                    slug: concert.slug,
                    artistName: concert.artistName,
                    startsAt: concert.startsAt,
                    endsAt: concert.endsAt,
                    venueName: concert.venueName,
                    city: concert.city,
                    posterAsset: concert.posterUrl ? { publicUrl: concert.posterUrl } : null,
                    availabilitySummary: {
                      totalAvailableQuantity: 0,
                      minPriceVnd: null,
                    },
                    eventType: 'CONCERT',
                    status: 'PUBLISHED',
                  } as any}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
