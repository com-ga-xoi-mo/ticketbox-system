import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConcerts, useConcertSession } from './hooks';
import { ConcertEmptyState } from './components/ConcertEmptyState';
import { StatusFilterTabs } from './components/StatusFilterTabs';
import { ConcertTable } from './components/ConcertTable';
import { ConcertFormModal } from './components/ConcertFormModal';
import { ConcertDetailPanel } from './components/ConcertDetailPanel';
import { Button } from '../../shared/ui/Button';
import { Pagination } from '../../shared/ui/Pagination';
import type { Concert, ConcertStatus } from './types';

const PAGE_SIZE = 10;

export function ConcertsPage() {
  const { data: concerts = [], isLoading, isError, error, refetch } = useConcerts();
  const { role } = useConcertSession();
  const isAdmin = role === 'ADMIN';

  const [selectedStatus, setSelectedStatus] = useState<ConcertStatus | 'ALL'>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedConcert, setSelectedConcert] = useState<Concert | null>(null);

  // Reset to page 1 whenever filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedCity, searchQuery]);

  const counts = useMemo(() => {
    const defaultCounts = { ALL: concerts.length, PUBLISHED: 0, DRAFT: 0, CANCELLED: 0, ENDED: 0 };
    concerts.forEach((c) => {
      const status = c.status as ConcertStatus;
      if (status in defaultCounts) defaultCounts[status] += 1;
    });
    return defaultCounts;
  }, [concerts]);

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
        c.artistName.toLowerCase().includes(searchLower) ||
        c.venueName.toLowerCase().includes(searchLower) ||
        c.city.toLowerCase().includes(searchLower);
      return matchesStatus && matchesCity && matchesSearch;
    });
  }, [concerts, selectedStatus, selectedCity, searchQuery]);

  const totalPages = Math.ceil(filteredConcerts.length / PAGE_SIZE);

  const paginatedConcerts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredConcerts.slice(start, start + PAGE_SIZE);
  }, [filteredConcerts, currentPage]);

  const handleOpenCreate = () => {
    setIsFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center" role="status">
        <div
          className="size-10 animate-spin rounded-full border-b-2 border-t-2 border-primary"
          aria-hidden="true"
        />
        <p className="mt-4 font-mono text-sm text-on-surface-variant">Loading concerts…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined mb-4 text-4xl text-error" aria-hidden="true">
          error
        </span>
        <h3 className="font-display text-lg font-bold text-on-surface">Failed to load concerts</h3>
        <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
          {error?.message || 'There was an issue fetching the concert records from the server.'}
        </p>
        <Button onClick={() => refetch()} className="mt-6">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">refresh</span>
          Retry connection
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden p-4 md:px-8 md:py-3">
      {/* Page header */}
      <div className="flex shrink-0 items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-on-surface">
            Concert Management
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {isAdmin
              ? 'Review, edit, and moderate all concerts and their lifecycle status.'
              : 'Create, update, publish, and cancel your concert events.'}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={handleOpenCreate}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add_circle
            </span>
            Create concert
          </Button>
        )}
      </div>

      {concerts.length === 0 ? (
        <div className="flex-1 overflow-y-auto mt-4">
          <ConcertEmptyState canCreate={!isAdmin} onCreateClick={handleOpenCreate} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden mt-2">
          {/* Top Tabs */}
          <div className="shrink-0">
            <StatusFilterTabs
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              counts={counts}
            />
          </div>

          <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
            {/* Main list */}
            <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
              {/* Filter toolbar — matches Stitch layout */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-surface-variant/20 px-3 py-2">
                {/* Search — flex-1, max-w-md */}
                <div className="group relative min-w-[200px] flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant transition-colors group-focus-within:text-secondary">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search concerts"
                    placeholder="Search by title or artist..."
                    className="w-full rounded-md border border-white/10 bg-surface-container-low py-1.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant transition-all focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/50"
                  />
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  {/* Status dropdown */}
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as ConcertStatus | 'ALL')}
                      className="appearance-none cursor-pointer rounded-md border border-white/10 bg-surface-container-low py-1.5 pl-3 pr-8 text-sm text-on-surface transition-all focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/50"
                    >
                      <option value="ALL">Status: All</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="DRAFT">Draft</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="ENDED">Ended</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
                      expand_more
                    </span>
                  </div>

                  {/* City dropdown */}
                  <div className="relative">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="appearance-none cursor-pointer rounded-md border border-white/10 bg-surface-container-low py-1.5 pl-3 pr-8 text-sm text-on-surface transition-all focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/50"
                    >
                      <option value="ALL">City: All</option>
                      {uniqueCities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
                      expand_more
                    </span>
                  </div>

                  {/* Reset filters */}
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedStatus('ALL'); setSelectedCity('ALL'); }}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-white/10 hover:text-white"
                    title="Clear filters"
                  >
                    <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                  </button>
                </div>
              </div>

              {/* Table — horizontally scrollable when narrow (detail panel open) */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredConcerts.length === 0 ? (
                <div className="p-12 text-center text-sm font-semibold text-on-surface-variant">
                  No concerts matching current filters.
                </div>
              ) : (
                <ConcertTable
                  concerts={paginatedConcerts}
                  onSelect={setSelectedConcert}
                  selectedId={selectedConcert?.id}
                />
              )}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredConcerts.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>

          {/* Detail panel */}
          {selectedConcert && (
            <div className="w-[400px] shrink-0">
              <ConcertDetailPanel
                concert={concerts.find((c) => c.id === selectedConcert.id) || selectedConcert}
                onClose={() => setSelectedConcert(null)}
                onEdit={() => navigate(`/concerts/${selectedConcert.id}/edit`)}
              />
            </div>
          )}
        </div>
        </div>
      )}

      {isFormOpen && (
        <ConcertFormModal concert={null} onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
