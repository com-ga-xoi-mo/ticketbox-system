import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with bundlers (Vite/Webpack)
// The default icon images are not resolved correctly, so we set them manually.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface VenueMapModalProps {
  latitude: number;
  longitude: number;
  venueName: string;
  address?: string;
  open: boolean;
  onClose: () => void;
}

export function VenueMapModal({ latitude, longitude, venueName, address, open, onClose }: VenueMapModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal content */}
      <div
        className="relative w-full max-w-3xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl border border-white/20 bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{venueName}</h3>
                {address && <p className="text-xs text-muted-foreground">{address}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Đóng bản đồ"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          {/* Map */}
          <div className="h-[28rem]">
            <MapContainer
              center={[latitude, longitude]}
              zoom={16}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[latitude, longitude]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{venueName}</p>
                    {address && <p className="text-xs text-gray-600">{address}</p>}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-5 py-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Mở trong Google Maps ↗
            </a>
            <button
              onClick={onClose}
              className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
