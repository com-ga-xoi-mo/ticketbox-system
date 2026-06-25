import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, User } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import type { PublicArtistSummary } from '@ticketbox/api-types';

interface ArtistCardProps {
  artist: PublicArtistSummary;
  variant?: 'default' | 'compact';
  className?: string;
}

export default function ArtistCard({ artist, variant = 'default', className }: ArtistCardProps) {
  const isCompact = variant === 'compact';

  return (
    <Link to={`/artists/${artist.slug}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
      <Card 
        className={cn(
          "h-full transition-colors hover:bg-muted/50 overflow-hidden", 
          isCompact ? "w-32 flex-shrink-0" : "w-full",
          className
        )}
      >
        <CardContent className={cn("flex flex-col items-center text-center", isCompact ? "p-3" : "p-6")}>
          <div className={cn(
            "relative rounded-full overflow-hidden bg-muted flex items-center justify-center mb-3",
            isCompact ? "w-20 h-20" : "w-28 h-28"
          )}>
            {artist.avatarAsset?.publicUrl ? (
              <img 
                src={artist.avatarAsset.publicUrl} 
                alt={artist.displayName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className={cn("text-muted-foreground", isCompact ? "w-8 h-8" : "w-12 h-12")} />
            )}
          </div>
          
          <h3 className={cn(
            "font-semibold text-foreground line-clamp-1 w-full",
            isCompact ? "text-sm" : "text-base"
          )}>
            {artist.displayName}
          </h3>
          
          {!isCompact && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Heart className="w-4 h-4" />
              <span>{artist.favoriteCount.toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
