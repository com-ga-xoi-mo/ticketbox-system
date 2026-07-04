import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { get } from '../../../shared/api/client';
import type { LocationSearchResponse } from '@ticketbox/api-types';

// Fix Leaflet default marker icon issue with Vite bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export interface VenueLocationPickerValue {
  latitude: number | null;
  longitude: number | null;
  venueAddress: string | undefined;
}

interface VenueLocationPickerProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  venueAddress: string | undefined;
  onChange: (value: VenueLocationPickerValue) => void;
}

// Sub-component: handles drag/click on map to update coordinates
function MapClickHandler({
  onPositionChange,
}: {
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sub-component: draggable marker
function DraggableMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const latlng = marker.getLatLng();
        onPositionChange(latlng.lat, latlng.lng);
      }
    },
  };

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

export function VenueLocationPicker({
  latitude,
  longitude,
  venueAddress,
  onChange,
}: VenueLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResponse['results']>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const hasCoords = latitude != null && longitude != null;

  // Vietnam overview center for no-coordinates state
  const defaultCenter: [number, number] = [16.0, 106.0];
  const defaultZoom = 5;
  const markerCenter: [number, number] | null = hasCoords
    ? [latitude as number, longitude as number]
    : null;

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 3) return;

    // Cancel previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedIndex(null);

    try {
      const data = await get<LocationSearchResponse>(`/locations/search?q=${encodeURIComponent(q)}`);
      setSearchResults(data.results ?? []);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setSearchError('Không thể tìm kiếm địa điểm. Vui lòng thử lại.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectResult = useCallback(
    (idx: number) => {
      const result = searchResults[idx];
      if (!result) return;
      setSelectedIndex(idx);
      onChange({
        latitude: result.latitude,
        longitude: result.longitude,
        venueAddress: result.displayName,
      });
      // Center map on result
      if (mapRef.current) {
        mapRef.current.setView([result.latitude, result.longitude], 16);
      }
    },
    [searchResults, onChange],
  );

  const handleMapPositionChange = useCallback(
    (lat: number, lng: number) => {
      onChange({ latitude: lat, longitude: lng, venueAddress });
    },
    [venueAddress, onChange],
  );

  const handleClearLocation = useCallback(() => {
    onChange({ latitude: null, longitude: null, venueAddress: undefined });
    setSearchResults([]);
    setSelectedIndex(null);
  }, [onChange]);

  // Keep map centered when coordinates change externally
  useEffect(() => {
    if (mapRef.current && latitude != null && longitude != null) {
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
    }
  }, [latitude, longitude]);

  return (
    <div className="space-y-3">
      {/* Privacy note */}
      <p className="text-xs text-muted-foreground">
        Lưu ý: Không nhập thông tin cá nhân hoặc bí mật vào ô tìm kiếm địa điểm. Dữ liệu được gửi đến dịch vụ OpenStreetMap/Nominatim công cộng.
      </p>

      {/* Search row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Nhập tên địa điểm (ít nhất 3 ký tự)..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching || searchQuery.trim().length < 3}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSearching ? 'Đang tìm...' : 'Tìm địa điểm'}
        </button>
      </div>

      {/* Error state */}
      {searchError && (
        <p className="text-sm text-destructive">{searchError}</p>
      )}

      {/* Search results */}
      {searchResults.length > 0 && (
        <ul className="divide-y divide-border rounded-md border bg-background text-sm">
          {searchResults.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => handleSelectResult(i)}
                className={`w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground ${
                  selectedIndex === i ? 'bg-accent font-medium' : ''
                }`}
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {searchResults.length === 0 && !isSearching && searchQuery.trim().length >= 3 && !searchError && (
        <p className="text-sm text-muted-foreground">Không tìm thấy kết quả.</p>
      )}

      {/* Current coordinates display */}
      {hasCoords && (
        <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span>
            Tọa độ: {(latitude as number).toFixed(6)}, {(longitude as number).toFixed(6)}
          </span>
          <button
            type="button"
            onClick={handleClearLocation}
            className="ml-2 font-medium text-destructive hover:underline"
          >
            Xóa vị trí
          </button>
        </div>
      )}

      {/* Map */}
      <div className="h-64 w-full overflow-hidden rounded-md border">
        <MapContainer
          center={markerCenter ?? defaultCenter}
          zoom={markerCenter ? 14 : defaultZoom}
          scrollWheelZoom
          className="h-full w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPositionChange={handleMapPositionChange} />
          {markerCenter && (
            <DraggableMarker
              position={markerCenter}
              onPositionChange={handleMapPositionChange}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Bản đồ: &copy;{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          OpenStreetMap
        </a>{' '}
        contributors. Bạn có thể click hoặc kéo marker để chọn tọa độ chính xác.
      </p>
    </div>
  );
}
