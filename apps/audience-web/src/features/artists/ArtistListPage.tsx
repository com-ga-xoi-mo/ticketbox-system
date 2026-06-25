import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Pagination, Button } from 'antd';
import { useArtists } from './hooks/useArtists';
import ArtistCard from './components/ArtistCard';
import ArtistSearchBar from './components/ArtistSearchBar';
import { Skeleton } from '../../components/ui/skeleton';
import { SeoHead } from '../../shared/ui/seo/SeoHead';

export default function ArtistListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get('q') || '';
  const pageStr = searchParams.get('page');
  const page = pageStr ? parseInt(pageStr, 10) : 1;
  const limit = 20;

  const { data, isLoading, isError, refetch } = useArtists({ q, page });

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    newParams.delete('page');
    setSearchParams(newParams);
  };

  return (
    <div className="container py-8 max-w-7xl mx-auto px-4">
      <SeoHead title="Artists | Ticketbox" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
          <p className="text-muted-foreground mt-2">Discover and follow your favorite artists.</p>
        </div>
        <ArtistSearchBar />
      </div>

      {isError ? (
        <div className="text-center py-12 border rounded-xl bg-muted/20">
          <h3 className="text-lg font-semibold mb-2">Failed to load artists</h3>
          <p className="text-muted-foreground mb-4">There was an error loading the artist list.</p>
          <Button onClick={() => refetch()} type="primary">Try Again</Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-6 border rounded-xl gap-4">
              <Skeleton className="w-28 h-28 rounded-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-muted/20">
          <h3 className="text-xl font-semibold mb-2">No artists found</h3>
          {q ? (
            <>
              <p className="text-muted-foreground mb-4">We couldn't find any artists matching "{q}".</p>
              <Button onClick={clearSearch}>Clear Search</Button>
            </>
          ) : (
            <p className="text-muted-foreground">There are currently no artists to display.</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
            {data?.items.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>

          {data && data.total > limit && (
            <div className="flex justify-center mt-8">
              <Pagination
                current={page}
                pageSize={limit}
                total={data.total}
                onChange={handlePageChange}
                showSizeChanger={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
