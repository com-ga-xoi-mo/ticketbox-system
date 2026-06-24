import { SeoHead } from '../../shared/ui/seo/SeoHead';
import { HeroBannerCarousel } from './home/HeroBannerCarousel';
import { CategoryNavBar } from './home/CategoryNavBar';
import { FeaturedEventRail } from './home/FeaturedEventRail';
import { PopularCategoriesGrid } from './home/PopularCategoriesGrid';
import { CityDiscoverySection } from './home/CityDiscoverySection';

export function HomePage() {
  return (
    <div className="relative flex flex-col min-h-screen">
      <SeoHead
        title="Ticketbox - Discover Events"
        description="Khám phá concert, festival, workshop, thể thao và trải nghiệm live được tuyển chọn với hệ thống đặt vé mượt mà và an toàn."
      />
      
      <CategoryNavBar />

      <main className="flex-1">
        <section className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <HeroBannerCarousel />
        </section>

        <section className="px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <FeaturedEventRail />
          <PopularCategoriesGrid />
          <CityDiscoverySection />
        </section>
      </main>
    </div>
  );
}
