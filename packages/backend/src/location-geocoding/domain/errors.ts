export class GeocodingProviderUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Geocoding provider is currently unavailable');
    this.name = 'GeocodingProviderUnavailableError';
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}
