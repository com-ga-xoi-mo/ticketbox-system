import React, { useEffect, useState, useRef } from 'react';
import { SeatingMapMetadata, SeatingZone } from '../venue-map-types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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
      try {
        const response = await fetch(`${API_BASE_URL}/assets/${seatingMap.assetId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch SVG');
        }
        const text = await response.text();
        setSvgContent(text);
      } catch (err: any) {
        setError(err.message || 'Error loading SVG');
      } finally {
        setIsLoading(false);
      }
    }
    fetchSvg();
  }, [seatingMap.assetId]);

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
      
      if (isSelected) {
        element.style.fill = 'rgba(99, 102, 241, 0.4)'; // indigo-500/40
        element.style.stroke = zone?.color || '#6366f1'; // indigo-500
        element.style.strokeWidth = '3px';
      } else if (isHovered) {
        element.style.fill = 'rgba(148, 163, 184, 0.4)'; // slate-400/40
        element.style.stroke = zone?.color || '#94a3b8'; // slate-400
        element.style.strokeWidth = '2px';
      } else {
        element.style.fill = 'rgba(30, 41, 59, 0.8)'; // slate-800/80
        element.style.stroke = zone?.color || '#475569'; // slate-600
        element.style.strokeWidth = '1px';
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
