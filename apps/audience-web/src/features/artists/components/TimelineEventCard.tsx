import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/card';
import { MapPin, Calendar } from 'lucide-react';
import type { PublicArtistTimelineEvent } from '@ticketbox/api-types';

interface TimelineEventCardProps {
  event: PublicArtistTimelineEvent;
}

export default function TimelineEventCard({ event }: TimelineEventCardProps) {
  const date = new Date(event.startsAt);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  
  return (
    <Link to={`/events/${event.slug}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card className="h-full transition-colors hover:bg-muted/50 overflow-hidden flex flex-col">
        <div className="relative w-full pt-[60%] bg-muted">
          {event.posterAsset?.publicUrl ? (
            <img 
              src={event.posterAsset.publicUrl} 
              alt={event.title} 
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <Calendar className="w-10 h-10 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">
            {event.eventType}
          </div>
        </div>
        
        <CardContent className="p-4 flex flex-col flex-grow">
          <h4 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {event.title}
          </h4>
          
          <div className="mt-auto space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{event.venueName}, {event.city}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
