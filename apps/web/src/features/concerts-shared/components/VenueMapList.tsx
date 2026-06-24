import React, { useState, useMemo, useEffect } from 'react';
import { Concert, ConcertStatus } from '../types';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent } from '../../../shared/ui/card';
import { Pagination } from '../../../shared/ui/pagination';
import { Calendar, MapPin, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mapStatus } from '../status';

interface VenueMapListProps {
  concerts: Concert[];
  basePath: string; // e.g. '/admin/venue-maps' or '/organizer/venue-maps'
  isLoading?: boolean;
}

const PAGE_SIZE = 10;

export function VenueMapList({ concerts, basePath, isLoading }: VenueMapListProps) {
  const navigate = useNavigate();
  
  const [selectedStatus, setSelectedStatus] = useState<ConcertStatus | 'ALL'>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedCity, searchQuery]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    concerts.forEach((c) => {
      if (c.city) cities.add(c.city);
    });
    return Array.from(cities).sort();
  }, [concerts]);

  const filteredConcerts = useMemo(() => {
    return concerts.filter((c) => {
      const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      const matchesCity = selectedCity === 'ALL' || c.city === selectedCity;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.title.toLowerCase().includes(searchLower) ||
        c.artistName.toLowerCase().includes(searchLower);
      return matchesStatus && matchesCity && matchesSearch;
    });
  }, [concerts, selectedStatus, selectedCity, searchQuery]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  const totalItems = filteredConcerts.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedConcerts = filteredConcerts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-slate-900/50 rounded-xl px-4 py-3 mb-2">
        {/* Search */}
        <div className="group relative min-w-[200px] flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 transition-colors group-focus-within:text-indigo-400">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search concerts"
            placeholder="Search by title or artist..."
            className="w-full rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ConcertStatus | 'ALL')}
              className="appearance-none cursor-pointer rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-3 pr-8 text-sm text-white transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="ALL">Status: All</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ENDED">Ended</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>

          {/* City dropdown */}
          <div className="relative">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="appearance-none cursor-pointer rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-3 pr-8 text-sm text-white transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            >
              <option value="ALL">City: All</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {filteredConcerts.length === 0 ? (
        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-700 rounded-lg bg-slate-900/50">
          No concerts found matching your filters.
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginatedConcerts.map((concert) => {
              const isConfigured = concert.seatingMapConfigured && concert.seatingZonesCount && concert.seatingZonesCount > 0;
              const isDraft = concert.status === 'DRAFT';
              const { label, variant, dotClass } = mapStatus(concert.status);
              
              return (
                <Card 
                  key={concert.id} 
                  className="bg-slate-900 border-slate-800 hover:border-indigo-500/50 transition-colors cursor-pointer overflow-hidden group"
                  onClick={() => navigate(`${basePath}/${concert.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      
                      {/* Event Info */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {concert.title}
                          </h3>
                          <Badge variant={variant as any}>
                            {dotClass && <span className={`size-1.5 rounded-full ${dotClass}`} />}
                            {label}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Music className="w-4 h-4 text-indigo-400" />
                            <span>{concert.artistName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-indigo-400" />
                            <span>{concert.venueName}, {concert.city}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-indigo-400" />
                            <span>{new Date(concert.startsAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Metrics */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:min-w-[340px]">
                        
                        <div className="flex-1 space-y-1">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tickets</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xl font-bold text-slate-200">
                              {concert.ticketTypesCount || 0}
                            </div>
                            <div className="text-sm text-slate-400">Types</div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-1 border-l border-slate-800 pl-6">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Map Status</div>
                          <div className="flex items-center gap-2">
                            {isConfigured ? (
                              <span className="text-sm text-slate-300 font-medium">{concert.seatingZonesCount} zones</span>
                            ) : (
                            <Badge variant="muted" className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20">Incomplete</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="hidden md:flex">
                          {isDraft ? (
                            <Button variant="outline" className="border-slate-700 hover:bg-slate-800 shrink-0">
                              Edit Map
                            </Button>
                          ) : (
                            <Button variant="ghost" className="text-slate-400 hover:text-white shrink-0">
                              View Map
                            </Button>
                          )}
                        </div>
                        
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}
