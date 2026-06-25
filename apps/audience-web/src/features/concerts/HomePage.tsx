import { useContext } from 'react';
import { SeoHead } from '../../shared/ui/seo/SeoHead';
import { AuthContext } from '../../shared/auth/AuthContext';
import { cn } from '../../lib/utils';
import { HeroBannerCarousel } from './home/HeroBannerCarousel';
import { CategoryNavBar } from './home/CategoryNavBar';
import { FeaturedEventRail } from './home/FeaturedEventRail';
import { PopularCategoriesGrid } from './home/PopularCategoriesGrid';
import { CityDiscoverySection } from './home/CityDiscoverySection';
import TopArtistsRail from '../artists/components/TopArtistsRail';
import { HomeTicketCalendarWidget } from '../account/components/HomeTicketCalendarWidget';

export function HomePage() {
  const auth = useContext(AuthContext);
  const showTicketCalendar = auth?.session?.roles.includes('AUDIENCE') ?? false;

  return (
    <div className="relative flex flex-col min-h-screen">
      <SeoHead
        title="Ticketbox - Discover Events"
        description="Khám phá concert, festival, workshop, thể thao và trải nghiệm live được tuyển chọn với hệ thống đặt vé mượt mà và an toàn."
      />
      
      <CategoryNavBar />

      <main className="flex-1">
        <section
          className={cn(
            'relative mx-auto grid w-full max-w-7xl gap-6 overflow-hidden px-4 py-8 sm:px-6 lg:px-8',
            showTicketCalendar && 'lg:grid-cols-[minmax(0,1fr)_320px]',
          )}
        >
          <div className="min-w-0">
            <HeroBannerCarousel />
          </div>
          {showTicketCalendar && <HomeTicketCalendarWidget />}
        </section>

        <section className="px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-12">
          <FeaturedEventRail />
          <TopArtistsRail />
          <PopularCategoriesGrid />
          <CityDiscoverySection />
        </section>
      </main>
    </div>
  );
}
