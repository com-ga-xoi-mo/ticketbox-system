/**
 * Hardcoded venue coordinates for demo purposes.
 * In production, these would come from the database (latitude/longitude columns on the Concert model).
 *
 * The map key is compared case-insensitively and with diacritics stripped,
 * so "Sân vận động Mỹ Đình" and "San van dong My Dinh" both resolve.
 */

interface VenueCoordinates {
  latitude: number;
  longitude: number;
}

const VENUE_COORDINATES: Record<string, VenueCoordinates> = {
  'san van dong my dinh': { latitude: 21.0203, longitude: 105.7639 },
  'nha thi dau phu tho': { latitude: 10.7579, longitude: 106.6504 },
  'trung tam hoi nghi quoc gia': { latitude: 21.0124, longitude: 105.7825 },
  'cung dien kinh my dinh': { latitude: 21.0185, longitude: 105.7556 },
  // Fallback entries for Vietnamese diacritics
  'san van dong quoc gia my dinh': { latitude: 21.0203, longitude: 105.7639 },
};

/** Default coordinates (Ho Chi Minh City center) when no venue match is found */
const DEFAULT_COORDINATES: VenueCoordinates = {
  latitude: 10.7769,
  longitude: 106.7009,
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

export function getVenueCoordinates(venueName: string): VenueCoordinates {
  const key = normalize(venueName);

  // Try exact match first
  if (VENUE_COORDINATES[key]) {
    return VENUE_COORDINATES[key];
  }

  // Try partial match (venue name contains a known key)
  for (const [knownKey, coords] of Object.entries(VENUE_COORDINATES)) {
    if (key.includes(knownKey) || knownKey.includes(key)) {
      return coords;
    }
  }

  return DEFAULT_COORDINATES;
}
