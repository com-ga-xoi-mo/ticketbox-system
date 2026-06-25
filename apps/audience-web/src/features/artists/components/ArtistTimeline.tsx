import React from 'react';
import TimelineEventCard from './TimelineEventCard';
import type { PublicArtistTimelineEvent } from '@ticketbox/api-types';

interface ArtistTimelineProps {
  events: PublicArtistTimelineEvent[];
  pastEventCount: number;
}

export default function ArtistTimeline({ events, pastEventCount }: ArtistTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-12 border rounded-xl bg-muted/20 text-center">
        <h3 className="text-lg font-semibold mb-2">No upcoming events</h3>
        <p className="text-muted-foreground">
          There are currently no upcoming events scheduled for this artist.
        </p>
        {pastEventCount > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            This artist has appeared in {pastEventCount} past event{pastEventCount !== 1 ? 's' : ''}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
        {pastEventCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {pastEventCount} past event{pastEventCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {events.map((event) => (
          <TimelineEventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
