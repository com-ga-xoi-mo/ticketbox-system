import React, { useEffect, useState, useRef } from 'react';
import { SeatingMapMetadata, SeatingZone } from '../venue-map-types';

import { getAssetUrl } from '../../../shared/api/client';

function hexToRgba(hex: string, alpha: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/i.test(hex)) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface VenueMapSvgViewerProps {
  seatingMap: SeatingMapMetadata;
  seatingZones: Partial<SeatingZone>[];
  selectedElementId: string | null;
  hoveredElementId: string | null;
  onElementClick: (id: string) => void;
  onElementHover: (id: string | null) => void;
}

export function VenueMapSvgViewer({
  seatingMap,
  seatingZones,
  selectedElementId,
  hoveredElementId,
  onElementClick,
  onElementHover,
}: VenueMapSvgViewerProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSvg() {
      if (!seatingMap.assetId) return;
      setIsLoading(true);
      setError(null);

      const urls = [
        ...(seatingMap.svgUrl ? [seatingMap.svgUrl] : []),
        getAssetUrl(seatingMap.assetId),
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const text = await response.text();
          if (text.trim().toLowerCase().startsWith('<svg') || text.includes('<svg')) {
            setSvgContent(text);
            setIsLoading(false);
            return;
          }
        } catch {
          // try next url
        }
      }

      setError('Failed to load venue map SVG');
      setIsLoading(false);
    }
    fetchSvg();
  }, [seatingMap.assetId, seatingMap.svgUrl]);

  useEffect(() => {
    if (!containerRef.current || !svgContent) return;

    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    // Apply styles to elements based on their status
    seatingMap.svgElementIds.forEach(id => {
      const element = svgElement.querySelector(`[id="${id}"]`) as SVGElement | null;
      if (!element) return;

      const zone = seatingZones.find(z => z.svgElementId === id);
      const isSelected = id === selectedElementId;
      const isHovered = id === hoveredElementId;

      // Base style
      element.style.cursor = 'pointer';
      element.style.transition = 'all 0.2s ease-in-out';
      
      const zoneColor = zone?.color;
      
      if (isSelected) {
        element.style.fill = zoneColor ? hexToRgba(zoneColor, 0.8) : 'rgba(99, 102, 241, 0.8)';
        element.style.stroke = '#ffffff';
        element.style.strokeWidth = '3px';
      } else if (isHovered) {
        element.style.fill = zoneColor ? hexToRgba(zoneColor, 0.6) : 'rgba(148, 163, 184, 0.6)';
        element.style.stroke = '#ffffff';
        element.style.strokeWidth = '2px';
      } else {
        element.style.fill = zoneColor ? hexToRgba(zoneColor, 0.3) : 'rgba(30, 41, 59, 0.8)';
        element.style.stroke = zoneColor || '#475569';
        element.style.strokeWidth = '1px';
      }
      
      // Update text if there is a sibling or child text element
      let textElement = element.nextElementSibling;
      if (textElement && textElement.tagName.toLowerCase() === 'text') {
        textElement.textContent = zone?.label || id;
      } else {
        const texts = element.parentElement?.querySelectorAll('text');
        if (texts && texts.length === 1) {
          texts[0].textContent = zone?.label || id;
        }
      }
    });

  }, [svgContent, seatingMap.svgElementIds, seatingZones, selectedElementId, hoveredElementId]);

  const handleContainerClick = (e: React.MouseEvent) => {
    let target = e.target as Element;
    // Traverse up to find if a valid element was clicked
    while (target && target !== containerRef.current) {
      if (target.id && seatingMap.svgElementIds.includes(target.id)) {
        onElementClick(target.id);
        return;
      }
      target = target.parentElement as Element;
    }
  };

  const handleContainerMouseOver = (e: React.MouseEvent) => {
    let target = e.target as Element;
    while (target && target !== containerRef.current) {
      if (target.id && seatingMap.svgElementIds.includes(target.id)) {
        onElementHover(target.id);
        return;
      }
      target = target.parentElement as Element;
    }
    onElementHover(null);
  };

  const handleContainerMouseOut = (e: React.MouseEvent) => {
     let target = e.target as Element;
     // Check if relatedTarget is outside the element
     const relatedTarget = e.relatedTarget as Element;
     
     let isStillInValidElement = false;
     let current = relatedTarget;
     while (current && current !== containerRef.current) {
        if (current.id && seatingMap.svgElementIds.includes(current.id)) {
          isStillInValidElement = true;
          break;
        }
        current = current.parentElement as Element;
     }

     if (!isStillInValidElement) {
        onElementHover(null);
     }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full w-full">Loading map...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-full w-full text-red-500">{error}</div>;
  }

  return (
    <div 
      className="w-full h-full relative overflow-auto flex items-center justify-center"
      onClick={handleContainerClick}
      onMouseOver={handleContainerMouseOver}
      onMouseOut={handleContainerMouseOut}
    >
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
        dangerouslySetInnerHTML={{ __html: svgContent || '' }} 
      />
    </div>
  );
}
