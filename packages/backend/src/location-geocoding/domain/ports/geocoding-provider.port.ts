import type { LocationResult } from '../location-result';

export const GEOCODING_PROVIDER = Symbol('GEOCODING_PROVIDER');

export interface GeocodingProviderPort {
  searchLocations(query: string): Promise<LocationResult[]>;
}
