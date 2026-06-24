import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useConcertList, useConcertCities } from '../../shared/api/catalog';
import { PageLoading, PageNoResults, PageError } from '../../shared/ui/PageStates';
import { EventCard } from '../../shared/ui/EventCard';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '../../components/ui/popover';
import { SeoHead } from '../../shared/ui/seo/SeoHead';
import { EventTypeFilter } from './components/EventTypeFilter';
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
    eventType: (searchParams.get('eventType') as any) || undefined,
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
  const [eventType, setEventType] = useState(currentParams.eventType || 'all');
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
    setEventType(searchParams.get('eventType') || 'all');
    
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
    if (eventType && eventType !== 'all') newParams.set('eventType', eventType);

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

  const seoTitle = currentParams.eventType && currentParams.eventType !== 'CONCERT' 
    ? `${currentParams.eventType} | Ticketbox`
    : currentParams.city 
      ? `Sự kiện tại ${currentParams.city} | Ticketbox` 
      : 'Khám phá Sự kiện | Ticketbox';
  
  const seoDescription = currentParams.eventType
    ? `Khám phá các ${currentParams.eventType.toLowerCase()} hấp dẫn đang mở bán trên Ticketbox.`
    : 'Khám phá concert, festival và trải nghiệm live được tuyển chọn với hệ thống đặt vé mượt mà và an toàn.';

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <SeoHead
        title={seoTitle}
        description={seoDescription}
      />
      <div className="mb-9">
        <Badge className="mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-primary">Lịch mở bán</Badge>
        <h1 className="text-4xl font-black tracking-tight text-foreground">Sự kiện sắp diễn ra</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Chọn trải nghiệm live tiếp theo của bạn từ danh sách sự kiện được tuyển chọn.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border bg-card p-4 shadow-sm">
        <EventTypeFilter 
          value={eventType} 
          onChange={(val) => {
            setEventType(val);
            // Auto-apply filter when category changes
            setTimeout(() => {
              const form = document.getElementById('filter-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }, 0);
          }} 
        />
        
        <form id="filter-form" onSubmit={handleApplyFilters} className="flex flex-wrap items-center gap-3 pt-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Tìm tên sự kiện, nghệ sĩ..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              className="h-10 rounded-full bg-background pl-9"
            />
          </div>
          
          {/* City Dropdown */}
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-10 w-[180px] rounded-full bg-background">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Chọn thành phố" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả thành phố</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 rounded-full bg-background font-normal justify-start">
                <CalendarDays className="mr-2 size-4 text-muted-foreground" />
                {dateFrom || dateTo ? 'Đã chọn thời gian' : 'Thời gian'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Khoảng thời gian diễn ra</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Từ ngày</label>
                    <Input 
                      type="date" 
                      value={dateFrom} 
                      onChange={(e) => setDateFrom(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Đến ngày</label>
                    <Input 
                      type="date" 
                      value={dateTo} 
                      onChange={(e) => setDateTo(e.target.value)} 
                    />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleApplyFilters()}>
                  Lưu & Áp dụng
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Price Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 rounded-full bg-background font-normal justify-start">
                <Banknote className="mr-2 size-4 text-muted-foreground" />
                {minPrice || maxPrice ? 'Đã chọn mức giá' : 'Mức giá'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Khoảng giá (VND)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Thấp nhất</label>
                    <Input 
                      type="number" min="0" step="100000"
                      placeholder="0" 
                      value={minPrice} 
                      onChange={(e) => setMinPrice(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Cao nhất</label>
                    <Input 
                      type="number" min="0" step="100000"
                      placeholder="Max" 
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(e.target.value)} 
                    />
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={() => handleApplyFilters()}>
                  Lưu & Áp dụng
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Sort Dropdown */}
          <Select value={sortOption} onValueChange={(val) => { setSortOption(val); }}>
            <SelectTrigger className="h-10 w-[180px] rounded-full bg-background">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Sắp xếp" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date_asc">Ngày gần nhất</SelectItem>
              <SelectItem value="date_desc">Ngày xa nhất</SelectItem>
              <SelectItem value="price_asc">Giá: Thấp đến Cao</SelectItem>
              <SelectItem value="price_desc">Giá: Cao đến Thấp</SelectItem>
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          <Button type="submit" className="h-10 rounded-full px-6 shadow-md">
            <SlidersHorizontal className="mr-2 size-4" />
            Lọc
          </Button>
          
          {hasActiveFilters && (
            <Button type="button" variant="ghost" className="h-10 rounded-full px-4 text-muted-foreground hover:bg-muted" onClick={handleClearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </form>
      </div>

      {isLoading && <PageLoading />}
      
      {isError && <PageError message="Không thể tải danh sách sự kiện. Vui lòng thử lại." />}
      
      {!isLoading && !isError && data && data.length === 0 && (
        <PageNoResults 
          onClearFilters={handleClearFilters} 
          message={
            hasActiveFilters 
              ? currentParams.eventType && currentParams.eventType !== 'CONCERT' 
                ? `Không có ${currentParams.eventType.toLowerCase()} nào khớp với các điều kiện lọc.`
                : "Không có sự kiện nào khớp với các điều kiện lọc của bạn."
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
