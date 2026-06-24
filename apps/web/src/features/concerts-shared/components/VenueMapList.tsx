import React, { useState } from 'react';
import { Concert } from '../types';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent } from '../../../shared/ui/card';
import { Pagination } from '../../../shared/ui/pagination';
import { Calendar, MapPin, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VenueMapListProps {
  concerts: Concert[];
  basePath: string; // e.g. '/admin/venue-maps' or '/organizer/venue-maps'
  isLoading?: boolean;
}

const PAGE_SIZE = 10;

export function VenueMapList({ concerts, basePath, isLoading }: VenueMapListProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading...</div>;
  }

  if (concerts.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 border border-dashed border-slate-700 rounded-lg bg-slate-900/50">
        No concerts found. Create a concert first.
      </div>
    );
  }

  const totalItems = concerts.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedConcerts = concerts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4">
        {paginatedConcerts.map((concert) => {
          const isConfigured = concert.seatingMapConfigured && concert.seatingZonesCount && concert.seatingZonesCount > 0;
          const isDraft = concert.status === 'DRAFT';
          
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
                      <Badge variant={concert.status === 'PUBLISHED' ? 'success' : concert.status === 'DRAFT' ? 'secondary' : 'default'}>
                        {concert.status}
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
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 md:min-w-[300px]">
                    
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
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Map Status</div>
                      <div className="flex items-center gap-2">
                        {isConfigured ? (
                          <>
                            <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">Ready</Badge>
                            <span className="text-sm text-slate-400">{concert.seatingZonesCount} zones</span>
                          </>
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
    </div>
  );
}
