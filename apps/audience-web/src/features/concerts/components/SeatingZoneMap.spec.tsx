import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { SeatingZoneMap } from './SeatingZoneMap';
import type { PublicAsset, PublicSeatingZone, PublicTicketType } from '@ticketbox/api-types';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(ok: boolean, text: string) {
  return { ok, text: () => Promise.resolve(text) };
}

const FIXTURE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <path id="stage" d="M0 0 L10 10" />
  <path id="zone-a" d="M0 0 L10 10" />
  <path id="zone-b" d="M20 20 L30 30" />
</svg>`;

const seatingMapAsset: PublicAsset = {
  id: 'asset-1',
  kind: 'SEATING_MAP',
  status: 'ACTIVE',
  publicUrl: '/uploads/seating-maps/map.svg',
  originalName: 'map.svg',
  contentType: 'image/svg+xml',
  sizeBytes: 100,
};

const seatingZones: PublicSeatingZone[] = [
  { id: 'zone-a-id', svgElementId: 'zone-a', label: 'Zone A', color: '#ff0000', displayOrder: 1, status: 'ACTIVE' },
  { id: 'zone-b-id', svgElementId: 'zone-b', label: 'Zone B', color: '#00ff00', displayOrder: 2, status: 'ACTIVE' },
];

function makeTicketType(overrides: Partial<PublicTicketType>): PublicTicketType {
  return {
    id: 'tt-1',
    code: 'T1',
    name: 'Ticket 1',
    description: null,
    priceVnd: 1000,
    totalQuantity: 10,
    availableQuantity: 10,
    maxPerUser: 4,
    saleStartsAt: '2020-01-01T00:00:00Z',
    saleEndsAt: '2030-01-01T00:00:00Z',
    status: 'ACTIVE',
    zoneIds: [],
    waitlistGated: false,
    ...overrides,
  };
}

function renderMap(overrides: Partial<ComponentProps<typeof SeatingZoneMap>> = {}) {
  const onZoneSelect = vi.fn();
  const onLoadError = vi.fn();
  const utils = render(
    <SeatingZoneMap
      seatingMapAsset={seatingMapAsset}
      seatingZones={seatingZones}
      ticketTypes={[]}
      selectedZoneId={null}
      activeTicketTypeId={null}
      onZoneSelect={onZoneSelect}
      onLoadError={onLoadError}
      {...overrides}
    />,
  );
  return { ...utils, onZoneSelect, onLoadError };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('SeatingZoneMap', () => {
  it('renders a loading skeleton while the SVG is being fetched', async () => {
    let resolveFetch!: (value: unknown) => void;
    mockFetch.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve; }));
    const { container } = renderMap();

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();

    resolveFetch(mockResponse(true, FIXTURE_SVG));
    await waitFor(() => expect(container.querySelector('svg')).toBeInTheDocument());
  });

  it('renders the fetched SVG content once loaded', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container } = renderMap();

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('falls back to getAssetUrl(assetId) when publicUrl fetch fails, and does not call onLoadError', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse(false, ''))
      .mockResolvedValueOnce(mockResponse(true, FIXTURE_SVG));
    const { container, onLoadError } = renderMap();

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(onLoadError).not.toHaveBeenCalled();
  });

  it('calls onLoadError and renders nothing when both URLs fail', async () => {
    mockFetch.mockResolvedValue(mockResponse(false, ''));
    const { container, onLoadError } = renderMap();

    await waitFor(() => {
      expect(onLoadError).toHaveBeenCalledTimes(1);
    });
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('calls onLoadError and renders nothing when the fetched text does not contain <svg', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, 'not an svg'));
    const { container, onLoadError } = renderMap();

    await waitFor(() => {
      expect(onLoadError).toHaveBeenCalledTimes(1);
    });
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('sets tabindex=0, role=button, aria-label and aria-pressed on every mapped zone element', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container } = renderMap();

    await waitFor(() => {
      const zoneA = container.querySelector('#zone-a');
      expect(zoneA).toHaveAttribute('tabindex', '0');
      expect(zoneA).toHaveAttribute('role', 'button');
      expect(zoneA).toHaveAttribute('aria-pressed', 'false');
      expect(zoneA?.getAttribute('aria-label')).toContain('Zone A');
    });

    // the unmapped "stage" element should not become interactive
    expect(container.querySelector('#stage')).not.toHaveAttribute('tabindex');
  });

  it('renders configured zone colors at full strength when idle', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container } = renderMap();

    await waitFor(() => {
      const zoneA = container.querySelector('#zone-a') as SVGElement;
      expect(zoneA.style.fill).toBe('#ff0000');
      expect(zoneA.style.stroke).toBe('');
      expect(zoneA.style.opacity).toBe('');
    });
  });

  it('uses a white outline for a selected zone without changing its fill color', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container } = renderMap({ selectedZoneId: 'zone-a-id' });

    await waitFor(() => {
      const zoneA = container.querySelector('#zone-a') as SVGElement;
      expect(zoneA.style.fill).toBe('#ff0000');
      expect(zoneA.style.stroke).toBe('#ffffff');
      expect(zoneA.style.strokeWidth).toBe('3px');
    });
  });

  it('clicking a mapped zone element calls onZoneSelect with its zone id', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container, onZoneSelect } = renderMap();

    await waitFor(() => expect(container.querySelector('#zone-a')).toBeInTheDocument());
    await userEvent.click(container.querySelector('#zone-a')!);

    await waitFor(() => expect(onZoneSelect).toHaveBeenCalledWith('zone-a-id'));
  });

  it('clicking the currently-selected zone element calls onZoneSelect(null) (toggle off)', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container, onZoneSelect } = renderMap({ selectedZoneId: 'zone-a-id' });

    await waitFor(() => expect(container.querySelector('#zone-a')).toBeInTheDocument());
    await userEvent.click(container.querySelector('#zone-a')!);

    await waitFor(() => expect(onZoneSelect).toHaveBeenCalledWith(null));
  });

  it('clicking an unmapped element (e.g. stage) calls onZoneSelect(null)', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container, onZoneSelect } = renderMap({ selectedZoneId: 'zone-a-id' });

    await waitFor(() => expect(container.querySelector('#stage')).toBeInTheDocument());
    await userEvent.click(container.querySelector('#stage')!);

    await waitFor(() => expect(onZoneSelect).toHaveBeenCalledWith(null));
  });

  it('pressing Enter on a focused mapped zone element calls onZoneSelect with its zone id', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container, onZoneSelect } = renderMap();

    await waitFor(() => expect(container.querySelector('#zone-a')).toBeInTheDocument());
    const zoneA = container.querySelector('#zone-a') as unknown as HTMLElement;
    zoneA.focus();
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(onZoneSelect).toHaveBeenCalledWith('zone-a-id'));
  });

  it('pressing Space selects the zone and prevents the default scroll action', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const { container, onZoneSelect } = renderMap();

    await waitFor(() => expect(container.querySelector('#zone-b')).toBeInTheDocument());
    const zoneB = container.querySelector('#zone-b') as unknown as HTMLElement;
    zoneB.focus();
    await userEvent.keyboard(' ');

    await waitFor(() => expect(onZoneSelect).toHaveBeenCalledWith('zone-b-id'));
  });

  it('hovering a mapped zone element updates the detail panel without calling onZoneSelect', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const ticketTypes = [makeTicketType({ id: 'tt-1', name: 'VIP', zoneIds: ['zone-a-id'] })];
    const { container, onZoneSelect } = renderMap({ ticketTypes });

    await waitFor(() => expect(container.querySelector('#zone-a')).toBeInTheDocument());
    await userEvent.hover(container.querySelector('#zone-a') as unknown as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Zone A')).toBeInTheDocument();
      expect(screen.getByText('VIP')).toBeInTheDocument();
      const zoneA = container.querySelector('#zone-a') as SVGElement;
      expect(zoneA.style.fill).toBe('#ff0000');
      expect(zoneA.style.stroke).toBe('#ffffff');
      expect(zoneA.style.strokeWidth).toBe('2px');
      expect(zoneA.style.transform).toBe('scale(1.03)');
    });
    expect(onZoneSelect).not.toHaveBeenCalled();
  });


  it('activeTicketTypeId highlights every zone mapped to that ticket type (multi-zone-per-ticket-type)', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const ticketTypes = [makeTicketType({ id: 'tt-1', zoneIds: ['zone-a-id', 'zone-b-id'] })];
    const { container } = renderMap({ ticketTypes, activeTicketTypeId: 'tt-1' });

    await waitFor(() => {
      const zoneA = container.querySelector('#zone-a') as HTMLElement;
      const zoneB = container.querySelector('#zone-b') as HTMLElement;
      expect(zoneA.getAttribute('aria-pressed')).toBe('true');
      expect(zoneB.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('selecting a zone mapped by multiple ticket types shows all of them in the panel (multi-ticket-type-per-zone)', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    const ticketTypes = [
      makeTicketType({ id: 'tt-1', name: 'VIP', zoneIds: ['zone-a-id'] }),
      makeTicketType({ id: 'tt-2', name: 'Standard', zoneIds: ['zone-a-id'] }),
    ];
    renderMap({ ticketTypes, selectedZoneId: 'zone-a-id' });

    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });
  });

  it('selecting a zone with no mapped ticket type shows "Chưa có loại vé áp dụng"', async () => {
    mockFetch.mockResolvedValue(mockResponse(true, FIXTURE_SVG));
    renderMap({ ticketTypes: [], selectedZoneId: 'zone-a-id' });

    await waitFor(() => {
      expect(screen.getByText('Chưa có loại vé áp dụng.')).toBeInTheDocument();
    });
  });
});
