import { Link } from 'react-router-dom';
import { useConcertCities } from '../../../shared/api/catalog';
import { Button } from '../../../components/ui/button';

export function CityDiscoverySection() {
  const { data: cities = [], isLoading } = useConcertCities();

  // Date shortcuts computation
  const now = new Date();
  
  // This weekend
  const thisWeekendStart = new Date(now);
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
  thisWeekendStart.setDate(now.getDate() + daysUntilSaturday);
  thisWeekendStart.setHours(0, 0, 0, 0);
  
  const thisWeekendEnd = new Date(thisWeekendStart);
  thisWeekendEnd.setDate(thisWeekendStart.getDate() + 1);
  thisWeekendEnd.setHours(23, 59, 59, 999);

  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Next month
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

  const formatIso = (date: Date) => encodeURIComponent(date.toISOString());

  return (
    <div className="py-8 border-t">
      <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl mb-6">Khám phá nhanh</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Theo thành phố</h3>
          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 w-24 bg-muted animate-pulse rounded-full" />
              ))
            ) : cities.length > 0 ? (
              cities.map((city) => (
                <Button key={city} asChild variant="outline" className="rounded-full bg-card hover:bg-primary hover:text-primary-foreground">
                  <Link to={`/events?city=${encodeURIComponent(city)}`}>{city}</Link>
                </Button>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Chưa có thành phố nào</span>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Theo thời gian</h3>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full bg-card hover:bg-primary hover:text-primary-foreground">
              <Link to={`/events?dateFrom=${formatIso(thisWeekendStart)}&dateTo=${formatIso(thisWeekendEnd)}`}>
                Cuối tuần này
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-card hover:bg-primary hover:text-primary-foreground">
              <Link to={`/events?dateFrom=${formatIso(thisMonthStart)}&dateTo=${formatIso(thisMonthEnd)}`}>
                Trong tháng này
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full bg-card hover:bg-primary hover:text-primary-foreground">
              <Link to={`/events?dateFrom=${formatIso(nextMonthStart)}&dateTo=${formatIso(nextMonthEnd)}`}>
                Tháng sau
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
