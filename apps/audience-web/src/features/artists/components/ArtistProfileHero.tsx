import React from 'react';
import { User } from 'lucide-react';
import FollowFavoriteControls from './FollowFavoriteControls';
import { cn } from '../../../lib/utils';
import type { PublicArtistProfile } from '@ticketbox/api-types';

interface ArtistProfileHeroProps {
  profile: PublicArtistProfile;
}

export default function ArtistProfileHero({ profile }: ArtistProfileHeroProps) {
  return (
    <div className="relative mb-12">
      {/* Background Poster/Banner */}
      <div className="absolute inset-0 w-full h-[300px] md:h-[400px] bg-secondary/30 overflow-hidden">
        {profile.posterAsset?.publicUrl ? (
          <img 
            src={profile.posterAsset.publicUrl} 
            alt={profile.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-primary/20 to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="relative pt-[200px] md:pt-[280px] container max-w-5xl mx-auto px-4 z-10">
        <div className="flex flex-col md:flex-row gap-6 md:items-end">
          {/* Avatar */}
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-background overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center shadow-xl">
            {profile.avatarAsset?.publicUrl ? (
              <img 
                src={profile.avatarAsset.publicUrl} 
                alt={profile.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-muted-foreground" />
            )}
          </div>
          
          {/* Info & Controls */}
          <div className="flex flex-col gap-4 flex-grow md:pb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground drop-shadow-sm">
                {profile.displayName}
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground text-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-base">
                  {profile.followerCount.toLocaleString()}
                </span>
                <span>Followers</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-base">
                  {profile.favoriteCount.toLocaleString()}
                </span>
                <span>Favorites</span>
              </div>
              
              <div className="ml-auto md:ml-0 mt-2 md:mt-0">
                <FollowFavoriteControls 
                  artistId={profile.id}
                  slug={profile.slug}
                  viewerFollowing={profile.viewerFollowing}
                  viewerFavorited={profile.viewerFavorited}
                  followerCount={profile.followerCount}
                  favoriteCount={profile.favoriteCount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mt-8 max-w-3xl">
            <h2 className="text-xl font-semibold mb-3">About</h2>
            <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {profile.bio}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
