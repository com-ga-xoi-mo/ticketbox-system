import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useArtistProfile } from './hooks/useArtistProfile';
import ArtistProfileHero from './components/ArtistProfileHero';
import ArtistTimeline from './components/ArtistTimeline';
import { Skeleton } from '../../components/ui/skeleton';
import { SeoHead } from '../../shared/ui/seo/SeoHead';

export default function ArtistProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, isLoading, isError, error, refetch } = useArtistProfile(slug || '');

  // Handle 404 (Not Found)
  if (isError && (error as any)?.message?.includes('404')) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-20 text-center">
        <SeoHead title="Artist Not Found | Ticketbox" />
        <h1 className="text-4xl font-bold tracking-tight mb-4">Artist Not Found</h1>
        <p className="text-xl text-muted-foreground mb-8">
          The artist you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/artists">
          <Button type="primary" size="large" icon={<ArrowLeft className="w-4 h-4 mr-2 inline" />}>
            Back to Artists
          </Button>
        </Link>
      </div>
    );
  }

  // Handle other errors
  if (isError) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-8">Failed to load artist profile. Please try again later.</p>
        <Button onClick={() => refetch()} type="primary">Try Again</Button>
      </div>
    );
  }

  // Loading state
  if (isLoading || !profile) {
    return (
      <div className="animate-pulse">
        <div className="w-full h-[300px] md:h-[400px] bg-muted/50" />
        <div className="container max-w-5xl mx-auto px-4 -mt-16 md:-mt-24 relative z-10">
          <div className="flex flex-col md:flex-row gap-6">
            <Skeleton className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-background" />
            <div className="pt-16 md:pt-24 space-y-4 w-full">
              <Skeleton className="h-10 w-1/2 md:w-1/3" />
              <div className="flex gap-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
          <div className="mt-12 space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <SeoHead 
        title={`${profile.displayName} | Ticketbox`}
        description={profile.bio ? profile.bio.substring(0, 160) : undefined}
        imageUrl={profile.avatarAsset?.publicUrl || profile.posterAsset?.publicUrl || undefined}
      />
      
      <ArtistProfileHero profile={profile} />
      
      <div className="container max-w-5xl mx-auto px-4">
        <ArtistTimeline 
          events={profile.upcomingEvents} 
          pastEventCount={profile.pastEventCount} 
        />
      </div>
    </div>
  );
}
