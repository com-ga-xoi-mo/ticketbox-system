// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React, { useImperativeHandle } from 'react';

// Must mock leaflet before it gets imported by anything
vi.mock('leaflet', () => {
  return {
    default: {
      Icon: {
        Default: {
          prototype: { _getIconUrl: vi.fn() },
          mergeOptions: vi.fn(),
        }
      }
    }
  };
});

// Mock react-leaflet
vi.mock('react-leaflet', () => {
  return {
    MapContainer: React.forwardRef(({ children }: any, ref: any) => {
      useImperativeHandle(ref, () => ({
        getZoom: () => 13,
        setView: vi.fn(),
      }));
      return <div data-testid="map-container">{children}</div>;
    }),
    TileLayer: React.forwardRef((props: any, ref: any) => <div data-testid="tile-layer" />),
    Marker: React.forwardRef(({ position }: any, ref: any) => (
      <div data-testid="marker" data-lat={position[0]} data-lng={position[1]} />
    )),
    useMapEvents: () => null,
  };
});

import { VenueLocationPicker } from './VenueLocationPicker';
import { get } from '../../../shared/api/client';

// Mock api client
vi.mock('../../../shared/api/client', () => ({
  get: vi.fn(),
}));

describe('VenueLocationPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with no initial coordinates', () => {
    const onChange = vi.fn();
    render(
      <VenueLocationPicker
        latitude={null}
        longitude={null}
        venueAddress=""
        onChange={onChange}
      />
    );
    
    expect(screen.getByPlaceholderText(/nhập tên địa điểm/i)).toBeInTheDocument();
    expect(screen.queryByTestId('map-container')).toBeInTheDocument();
  });

  it('renders map if coordinates are provided', () => {
    const onChange = vi.fn();
    render(
      <VenueLocationPicker
        latitude={10.762622}
        longitude={106.660172}
        venueAddress="Some Address"
        onChange={onChange}
      />
    );
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('marker')).toHaveAttribute('data-lat', '10.762622');
    expect(screen.getByTestId('marker')).toHaveAttribute('data-lng', '106.660172');
  });

  it('searches for location and updates map on selection', async () => {
    const onChange = vi.fn();
    
    (get as any).mockResolvedValue({
      results: [
        {
          placeId: '123',
          displayName: 'Landmark 81, HCM',
          latitude: 10.794,
          longitude: 106.722,
          type: 'building',
        },
      ],
    });

    render(
      <VenueLocationPicker
        latitude={null}
        longitude={null}
        venueAddress=""
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText(/nhập tên địa điểm/i);
    await userEvent.type(input, 'Landmark 81');
    const searchButton = screen.getByRole('button', { name: /tìm địa điểm/i });
    
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Landmark 81, HCM')).toBeInTheDocument();
    });

    const resultItem = screen.getByText('Landmark 81, HCM');
    await userEvent.click(resultItem);

    expect(onChange).toHaveBeenCalledWith({
      latitude: 10.794,
      longitude: 106.722,
      venueAddress: 'Landmark 81, HCM',
    });
  });

  it('clears location when clear button is clicked', async () => {
    const onChange = vi.fn();
    render(
      <VenueLocationPicker
        latitude={10.762622}
        longitude={106.660172}
        venueAddress="Some Address"
        onChange={onChange}
      />
    );
    
    const clearButton = screen.getByRole('button', { name: /xóa/i });
    await userEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith({
      latitude: null,
      longitude: null,
      venueAddress: undefined,
    });
  });
});
