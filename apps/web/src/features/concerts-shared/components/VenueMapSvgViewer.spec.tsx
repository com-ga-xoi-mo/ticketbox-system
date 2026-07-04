// @vitest-environment jsdom

import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VenueMapSvgViewer } from './VenueMapSvgViewer';

const svg = '<svg viewBox="0 0 100 100"><path id="zone-a" d="M0 0h20v20z" /></svg>';
const seatingMap = { assetId: null, svgUrl: null, svgElementIds: ['zone-a'] };
const seatingZones = [{
  id: 'zone-id',
  concertId: 'concert-id',
  svgElementId: 'zone-a',
  label: 'Zone A',
  color: '#22c55e',
  displayOrder: 0,
}];

function renderViewer(selectedElementId: string | null = null) {
  return render(
    <VenueMapSvgViewer
      seatingMap={seatingMap}
      seatingZones={seatingZones}
      selectedElementId={selectedElementId}
      hoveredElementId={null}
      onElementClick={vi.fn()}
      onElementHover={vi.fn()}
      svgContentOverride={svg}
    />,
  );
}

describe('VenueMapSvgViewer zone colors', () => {
  it('renders the configured color without dimming', async () => {
    const { container } = renderViewer();

    await waitFor(() => {
      const zone = container.querySelector('#zone-a') as SVGElement;
      expect(zone.style.fill).toBe('#22c55e');
      expect(zone.style.stroke).toBe('');
      expect(zone.style.opacity).toBe('');
    });
  });

  it('keeps the fill and adds a white outline when selected', async () => {
    const { container } = renderViewer('zone-a');

    await waitFor(() => {
      const zone = container.querySelector('#zone-a') as SVGElement;
      expect(zone.style.fill).toBe('#22c55e');
      expect(zone.style.stroke).toBe('#ffffff');
      expect(zone.style.strokeWidth).toBe('3px');
    });
  });

  it('scales on hover without changing the fill', async () => {
    const onElementHover = vi.fn();
    const { container, rerender } = render(
      <VenueMapSvgViewer
        seatingMap={seatingMap}
        seatingZones={seatingZones}
        selectedElementId={null}
        hoveredElementId={null}
        onElementClick={vi.fn()}
        onElementHover={onElementHover}
        svgContentOverride={svg}
      />,
    );
    await waitFor(() => expect(container.querySelector('#zone-a')).toBeInTheDocument());
    fireEvent.mouseOver(container.querySelector('#zone-a')!);
    expect(onElementHover).toHaveBeenCalledWith('zone-a');

    rerender(
      <VenueMapSvgViewer
        seatingMap={seatingMap}
        seatingZones={seatingZones}
        selectedElementId={null}
        hoveredElementId="zone-a"
        onElementClick={vi.fn()}
        onElementHover={onElementHover}
        svgContentOverride={svg}
      />,
    );

    await waitFor(() => {
      const zone = container.querySelector('#zone-a') as SVGElement;
      expect(zone.style.fill).toBe('#22c55e');
      expect(zone.style.stroke).toBe('#ffffff');
      expect(zone.style.strokeWidth).toBe('2px');
      expect(zone.style.transform).toBe('scale(1.03)');
    });
  });
});
