import React, { useState, useEffect } from 'react';
import { useActiveArtists } from '../../artists-shared/hooks';
import { Button } from '../../../shared/ui/button';

export interface ArtistSelectorProps {
  selectedArtists: { artistId: string; displayName: string; avatarUrl: string | null; status: string }[];
  onChange: (artists: { artistId: string; displayName: string; avatarUrl: string | null; status: string }[]) => void;
}

export function ArtistSelector({ selectedArtists, onChange }: ArtistSelectorProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, isLoading } = useActiveArtists(debouncedQuery ? { q: debouncedQuery } : {}, !!debouncedQuery);

  const handleAdd = (artist: any) => {
    if (selectedArtists.find((a) => a.artistId === artist.id)) return;
    onChange([...selectedArtists, {
      artistId: artist.id,
      displayName: artist.displayName,
      avatarUrl: artist.avatarAsset?.publicUrl || null,
      status: 'ACTIVE',
    }]);
    setQuery('');
  };

  const handleRemove = (id: string) => {
    onChange(selectedArtists.filter((a) => a.artistId !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newArtists = [...selectedArtists];
    const temp = newArtists[index - 1];
    newArtists[index - 1] = newArtists[index];
    newArtists[index] = temp;
    onChange(newArtists);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedArtists.length - 1) return;
    const newArtists = [...selectedArtists];
    const temp = newArtists[index + 1];
    newArtists[index + 1] = newArtists[index];
    newArtists[index] = temp;
    onChange(newArtists);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm nghệ sĩ đang hoạt động..."
          className="w-full h-10 rounded-lg border border-white/10 bg-surface-container px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {isLoading && <div className="absolute right-3 top-2.5 text-xs text-on-surface-variant">Đang tìm...</div>}
        {data && data.items.length > 0 && query && (
          <div className="absolute z-10 w-full mt-1 bg-surface-container-high border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {data.items.map((artist) => (
              <button
                key={artist.id}
                type="button"
                className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-3"
                onClick={() => handleAdd(artist)}
              >
                {artist.avatarAsset?.publicUrl ? (
                  <img src={artist.avatarAsset.publicUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">A</div>
                )}
                <span>{artist.displayName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedArtists.length > 0 && (
        <div className="border border-white/10 rounded-lg divide-y divide-white/5">
          {selectedArtists.map((artist, i) => (
            <div key={artist.artistId} className="p-3 flex items-center justify-between bg-surface-container-low">
              <div className="flex items-center gap-3">
                {artist.avatarUrl ? (
                  <img src={artist.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">A</div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{artist.displayName}</span>
                    {i === 0 && <span className="bg-primary/20 text-primary text-[10px] uppercase px-1.5 py-0.5 rounded font-bold">Chính</span>}
                    {artist.status === 'INACTIVE' && <span className="bg-error/20 text-error text-[10px] uppercase px-1.5 py-0.5 rounded font-bold">Không hoạt động</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={i === 0} onClick={() => handleMoveUp(i)}>
                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 px-2" disabled={i === selectedArtists.length - 1} onClick={() => handleMoveDown(i)}>
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-error hover:text-error hover:bg-error/10" onClick={() => handleRemove(artist.artistId)}>
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
