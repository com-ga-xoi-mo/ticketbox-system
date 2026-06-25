import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useConcertList } from '../../../shared/api/catalog';
import { EventCard } from '../../../shared/ui/EventCard';
import { Button } from '../../../components/ui/button';
import { useRef } from 'react';

export function FeaturedEventRail() {
  const { data: concerts, isLoading, isError } = useConcertList({ sortBy: 'date', sortDir: 'asc' });
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 400;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Only take the first 10
  const items = concerts?.slice(0, 10) || [];

  if (isError) {
    return (
      <div className="py-12 text-center text-muted-foreground bg-card rounded-2xl border">
        Không thể tải sự kiện. Vui lòng thử lại.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">Sự kiện nổi bật</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-2 mr-4">
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll('left')}>
              <ArrowLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => scroll('right')}>
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <Button asChild variant="outline" className="rounded-full bg-white/70">
            <Link to="/events">
              Xem tất cả
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-8 -mb-8 px-1"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[300px] w-[300px] sm:w-[350px] shrink-0 snap-start">
              <div className="h-[400px] rounded-3xl bg-muted animate-pulse" />
            </div>
          ))
        ) : (
          items.map((concert) => (
            <div key={concert.id} className="min-w-[300px] w-[300px] sm:w-[350px] shrink-0 snap-start">
              <EventCard concert={concert} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
