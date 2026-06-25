import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface Concert {
  id: string;
  title: string;
  artistName: string;
}

interface Props {
  concerts: Concert[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function SearchableConcertSelect({ concerts, selectedId, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedConcert = concerts.find(c => c.id === selectedId);

  const filteredConcerts = concerts.filter(c => {
    const s = search.toLowerCase();
    return c.title.toLowerCase().includes(s) || c.artistName.toLowerCase().includes(s) || c.id.toLowerCase().includes(s);
  });

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className="flex items-center justify-between w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 h-12 cursor-pointer hover:border-slate-700 transition-colors"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
      >
        <div className="flex flex-col overflow-hidden">
          {selectedConcert ? (
            <div className="truncate text-white font-medium">
              {selectedConcert.title} <span className="text-slate-400 text-xs font-normal">({selectedConcert.artistName})</span>
            </div>
          ) : (
            <div className="text-slate-400">Select an event...</div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[300px]">
          <div className="p-2 border-b border-[var(--divider)] flex items-center gap-2 bg-slate-900/50">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              className="bg-transparent border-none text-white text-sm focus:outline-none focus:ring-0 w-full"
              placeholder="Search by event name, artist, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredConcerts.length > 0 ? filteredConcerts.map(concert => (
              <div
                key={concert.id}
                className={`px-3 py-2 rounded-md cursor-pointer transition-colors ${concert.id === selectedId ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-white/5 text-white'}`}
                onClick={() => {
                  onSelect(concert.id);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium text-sm">{concert.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{concert.artistName} • <span className="font-mono">{concert.id.slice(0, 8)}...</span></div>
              </div>
            )) : (
              <div className="p-4 text-center text-slate-400 text-sm">No events found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
