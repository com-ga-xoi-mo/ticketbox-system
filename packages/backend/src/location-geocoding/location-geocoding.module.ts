import { Module } from '@nestjs/common';
import { PlatformConfigModule } from '../platform/config/platform-config.module';
import { RateLimitingModule } from '../platform/rate-limiting/rate-limiting.module';
import { GEOCODING_PROVIDER } from './domain/ports/geocoding-provider.port';
import { NominatimGeocodingAdapter } from './infrastructure/nominatim-geocoding.adapter';
import { SearchLocationsUseCase } from './application/search-locations.use-case';
import { LocationsController } from './adapters/http/locations.controller';
import { PlatformConfigService } from '../platform/config/platform-config.service';

@Module({
  imports: [PlatformConfigModule, RateLimitingModule],
  providers: [
    {
      provide: GEOCODING_PROVIDER,
      useFactory: (config: PlatformConfigService) => new NominatimGeocodingAdapter(config),
      inject: [PlatformConfigService],
    },
    SearchLocationsUseCase,
  ],
  controllers: [LocationsController],
  exports: [SearchLocationsUseCase],
})
export class LocationGeocodingModule {}
