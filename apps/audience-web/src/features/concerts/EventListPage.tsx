import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConcertList, useConcertCities } from '../../shared/api/catalog';
import { PageLoading, PageNoResults, PageError } from '../../shared/ui/PageStates';
import { EventCard } from '../../shared/ui/EventCard';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, SlidersHorizontal, MapPin, CalendarDays, Banknote, ArrowDownUp } from 'lucide-react';
import type { CatalogSearchParams } from '@ticketbox/api-types';

export function EventListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cities = [] } = useConcertCities();

  const currentParams: CatalogSearchParams = {
    q: searchParams.get('q') || undefined,
    city: searchParams.get('city') || undefined,
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    sortBy: (searchParams.get('sortBy') as any) || undefined,
    sortDir: (searchParams.get('sortDir') as any) || undefined,
  };

  const { data, isLoading, isError } = useConcertList(currentParams);

  // Local state for the filter form
  const [q, setQ] = useState(currentParams.q || '');
  const [city, setCity] = useState(currentParams.city || 'all');
  const [dateFrom, setDateFrom] = useState(currentParams.dateFrom ? currentParams.dateFrom.split('T')[0] : '');
  const [dateTo, setDateTo] = useState(currentParams.dateTo ? currentParams.dateTo.split('T')[0] : '');
  const [minPrice, setMinPrice] = useState(currentParams.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(currentParams.maxPrice?.toString() || '');
  const [sortOption, setSortOption] = useState(() => {
    if (currentParams.sortBy === 'price' && currentParams.sortDir === 'asc') return 'price_asc';
    if (currentParams.sortBy === 'price' && currentParams.sortDir === 'desc') return 'price_desc';
    if (currentParams.sortBy === 'date' && currentParams.sortDir === 'desc') return 'date_desc';
    return 'date_asc'; // default
  });

  // Sync state when URL changes externally
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setCity(searchParams.get('city') || 'all');
    setDateFrom(searchParams.get('dateFrom') ? searchParams.get('dateFrom')!.split('T')[0] : '');
    setDateTo(searchParams.get('dateTo') ? searchParams.get('dateTo')!.split('T')[0] : '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    
    const sb = searchParams.get('sortBy');
    const sd = searchParams.get('sortDir');
    if (sb === 'price' && sd === 'asc') setSortOption('price_asc');
    else if (sb === 'price' && sd === 'desc') setSortOption('price_desc');
    else if (sb === 'date' && sd === 'desc') setSortOption('date_desc');
    else setSortOption('date_asc');
  }, [searchParams]);

  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const newParams = new URLSearchParams();
    if (q.trim()) newParams.set('q', q.trim());
    if (city && city !== 'all') newParams.set('city', city);
    if (dateFrom) newParams.set('dateFrom', `${dateFrom}T00:00:00.000Z`);
    if (dateTo) newParams.set('dateTo', `${dateTo}T23:59:59.999Z`);
    if (minPrice && !isNaN(Number(minPrice))) newParams.set('minPrice', minPrice);
    if (maxPrice && !isNaN(Number(maxPrice))) newParams.set('maxPrice', maxPrice);

    if (sortOption === 'price_asc') {
      newParams.set('sortBy', 'price');
      newParams.set('sortDir', 'asc');
    } else if (sortOption === 'price_desc') {
      newParams.set('sortBy', 'price');
      newParams.set('sortDir', 'desc');
    } else if (sortOption === 'date_desc') {
      newParams.set('sortBy', 'date');
      newParams.set('sortDir', 'desc');
    } else if (sortOption === 'date_asc' && newParams.toString().length > 0) {
      newParams.set('sortBy', 'date');
      newParams.set('sortDir', 'asc');
    }

    setSearchParams(newParams);
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-9">
        <Badge className="mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-primary">Lịch mở bán</Badge>
        <h1 className="text-4xl font-black tracking-tight text-foreground">Sự kiện sắp diễn ra</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Chọn trải nghiệm live tiếp theo của bạn từ danh sách sự kiện được tuyển chọn.
        </p>
      </div>

      <div className="mb-8 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <form onSubmit={handleApplyFilters} className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Search className="size-3.5" /> Tìm kiếm
              </label>
              <Input 
                placeholder="Tên sự kiện, nghệ sĩ..." 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
                className="bg-background"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5" /> Địa điểm
              </label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Chọn thành phố" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thành phố</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Thời gian
              </label>
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                  className="bg-background"
                  aria-label="Từ ngày"
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                  className="bg-background"
                  aria-label="Đến ngày"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Banknote className="size-3.5" /> Mức giá (VND)
              </label>
              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  min="0"
                  step="100000"
                  placeholder="Min" 
                  value={minPrice} 
                  onChange={(e) => setMinPrice(e.target.value)} 
                  className="bg-background"
                />
                <span className="text-muted-foreground">-</span>
                <Input 
                  type="number" 
                  min="0"
                  step="100000"
                  placeholder="Max" 
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(e.target.value)} 
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row lg:shrink-0">
            <div className="space-y-1.5 min-w-[180px]">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <ArrowDownUp className="size-3.5" /> Sắp xếp
              </label>
              <Select value={sortOption} onValueChange={(val) => { setSortOption(val); }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sắp xếp theo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_asc">Ngày gần nhất</SelectItem>
                  <SelectItem value="date_desc">Ngày xa nhất</SelectItem>
                  <SelectItem value="price_asc">Giá: Thấp đến Cao</SelectItem>
                  <SelectItem value="price_desc">Giá: Cao đến Thấp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" className="flex-1 sm:flex-none">
                <SlidersHorizontal className="mr-2 size-4" />
                Lọc
              </Button>
              {hasActiveFilters && (
                <Button type="button" variant="outline" onClick={handleClearFilters}>
                  Xóa
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {isLoading && <PageLoading />}
      
      {isError && <PageError message="Không thể tải danh sách sự kiện. Vui lòng thử lại." />}
      
      {!isLoading && !isError && data && data.length === 0 && (
        <PageNoResults 
          onClearFilters={handleClearFilters} 
          message={
            hasActiveFilters 
              ? "Không có sự kiện nào khớp với các điều kiện lọc của bạn."
              : "Chưa có sự kiện nào đang mở bán. Hãy quay lại sau."
          }
        />
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((concert) => (
            <EventCard key={concert.id} concert={concert} />
          ))}
        </div>
      )}
    </div>
  );
}
