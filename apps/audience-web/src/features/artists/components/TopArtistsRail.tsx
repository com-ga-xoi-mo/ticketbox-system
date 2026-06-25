import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from 'antd';
import { useTopArtists } from '../hooks/useTopArtists';
import ArtistCard from './ArtistCard';
import { Skeleton } from '../../../components/ui/skeleton';

export default function TopArtistsRail() {
  const { data: artists, isLoading, isError } = useTopArtists();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (isError || (artists && artists.length === 0)) {
    return null; // hide on error or empty
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = current.clientWidth * 0.8;
      current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="relative group">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold tracking-tight">Top Artists</h2>
      </div>

      <div className="relative">
        {/* Nav Arrows (Desktop) */}
        <div className="hidden md:block">
          <Button
            type="default"
            shape="circle"
            icon={<ChevronLeft className="w-5 h-5" />}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll('left')}
          />
          <Button
            type="default"
            shape="circle"
            icon={<ChevronRight className="w-5 h-5" />}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => scroll('right')}
          />
        </div>

        {/* Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 pt-2 -mx-4 px-4 md:mx-0 md:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 snap-start">
                <Skeleton className="w-full h-40 rounded-xl" />
              </div>
            ))
          ) : (
            artists?.map((artist) => (
              <div key={artist.id} className="snap-start flex-shrink-0">
                <ArtistCard artist={artist} variant="compact" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
