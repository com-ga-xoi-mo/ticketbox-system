import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicAsset, PublicSeatingZone, PublicTicketType } from '@ticketbox/api-types';
import { getAssetUrl, resolveImageUrl } from '../../../shared/api/client';
import { Skeleton } from '../../../components/ui/skeleton';
import { ZoneTicketTypesPanel } from './ZoneTicketTypesPanel';
import { buildSvgElementIdIndex, getTicketTypesForZone, isZoneHighlighted } from '../utils/seating-zone-mapping';

interface SeatingZoneMapProps {
  seatingMapAsset: PublicAsset;
  seatingZones: PublicSeatingZone[];
  ticketTypes: PublicTicketType[];
  selectedZoneId: string | null;
  activeTicketTypeId: string | null;
  onZoneSelect: (zoneId: string | null) => void;
  onLoadError: () => void;
  className?: string;
}

type LoadState = 'loading' | 'loaded' | 'error';

function resolveZoneElement(target: Element | null, containerEl: Element | null, knownIds: Set<string>): Element | null {
  let el = target;
  while (el && el !== containerEl) {
    if (el.id && knownIds.has(el.id)) return el;
    el = el.parentElement;
  }
  return null;
}

export function SeatingZoneMap({
  seatingMapAsset,
  seatingZones,
  ticketTypes,
  selectedZoneId,
  activeTicketTypeId,
  onZoneSelect,
  onLoadError,
  className,
}: SeatingZoneMapProps) {
  const [svgText, setSvgText] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [peekZoneId, setPeekZoneId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoneBySvgElementId = useMemo(() => buildSvgElementIdIndex(seatingZones), [seatingZones]);
  const knownIds = useMemo(() => new Set(zoneBySvgElementId.keys()), [zoneBySvgElementId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSvg() {
      setLoadState('loading');

      const candidateUrls = [
        ...(seatingMapAsset.publicUrl ? [resolveImageUrl(seatingMapAsset.publicUrl)] : []),
        getAssetUrl(seatingMapAsset.id),
      ].filter((url): url is string => Boolean(url));

      for (const url of candidateUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const text = await response.text();
          if (text.includes('<svg')) {
            if (!cancelled) {
              setSvgText(text);
              setLoadState('loaded');
            }
            return;
          }
        } catch {
          // try next url
        }
      }

      if (!cancelled) {
        setLoadState('error');
        onLoadError();
      }
    }

    fetchSvg();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatingMapAsset.id, seatingMapAsset.publicUrl]);

  useEffect(() => {
    if (!containerRef.current || loadState !== 'loaded') return;
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;

    seatingZones.forEach((zone) => {
      const element = svgElement.querySelector(`[id="${zone.svgElementId}"]`) as SVGElement | null;
      if (!element) return;

      const isActive = isZoneHighlighted(zone, selectedZoneId, activeTicketTypeId, ticketTypes);
      const isHovered = zone.id === peekZoneId;
      const zoneColor = zone.color;

      element.style.cursor = 'pointer';
      element.style.transition = 'transform 0.2s ease-in-out, stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out';
      element.style.transformBox = 'fill-box';
      element.style.transformOrigin = 'center';
      element.style.transform = isHovered ? 'scale(1.03)' : 'scale(1)';
      element.style.fill = zoneColor || '';

      if (isActive) {
        element.style.stroke = '#ffffff';
        element.style.strokeWidth = '3px';
      } else if (isHovered) {
        element.style.stroke = '#ffffff';
        element.style.strokeWidth = '2px';
      } else {
        element.style.stroke = '';
        element.style.strokeWidth = '';
      }

      // Update text if there is a sibling or child text element
      let textElement = element.nextElementSibling;
      if (textElement && textElement.tagName.toLowerCase() === 'text') {
        textElement.textContent = zone.label || zone.svgElementId;
      } else {
        const texts = element.parentElement?.querySelectorAll('text');
        if (texts && texts.length === 1) {
          texts[0].textContent = zone.label || zone.svgElementId;
        }
      }

      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-pressed', String(isActive));

      const applicableCount = getTicketTypesForZone(zone.id, ticketTypes).length;
      const zoneSummary = applicableCount > 0
        ? `${applicableCount} loại vé áp dụng.`
        : 'Chưa có loại vé áp dụng.';
      element.setAttribute('aria-label', `Khu vực ${zone.label}. ${zoneSummary}`);
    });
  }, [loadState, seatingZones, ticketTypes, selectedZoneId, activeTicketTypeId, peekZoneId]);

  const findZoneIdFromTarget = (target: EventTarget | null): string | null => {
    const el = resolveZoneElement(target as Element | null, containerRef.current, knownIds);
    if (!el) return null;
    return zoneBySvgElementId.get(el.id)?.id ?? null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const zoneId = findZoneIdFromTarget(e.target);
    onZoneSelect(zoneId && zoneId === selectedZoneId ? null : zoneId);
  };

  const handleMouseOver = (e: React.MouseEvent) => {
    setPeekZoneId(findZoneIdFromTarget(e.target));
  };

  const handleMouseOut = (e: React.MouseEvent) => {
    const relatedZoneId = findZoneIdFromTarget(e.relatedTarget);
    if (!relatedZoneId) setPeekZoneId(null);
  };

  const handleFocus = (e: React.FocusEvent) => {
    setPeekZoneId(findZoneIdFromTarget(e.target));
  };

  const handleBlur = (e: React.FocusEvent) => {
    const relatedZoneId = findZoneIdFromTarget(e.relatedTarget);
    if (!relatedZoneId) setPeekZoneId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const zoneId = findZoneIdFromTarget(e.target);
    if (!zoneId) return;
    e.preventDefault();
    onZoneSelect(zoneId === selectedZoneId ? null : zoneId);
  };

  if (loadState === 'loading') {
    return <Skeleton className={className ?? 'aspect-[4/3] w-full'} />;
  }

  if (loadState === 'error') {
    return null;
  }

  const peekedOrSelectedZone = seatingZones.find((z) => z.id === (peekZoneId ?? selectedZoneId)) ?? null;
  const panelTicketTypes = peekedOrSelectedZone
    ? getTicketTypesForZone(peekedOrSelectedZone.id, ticketTypes)
    : [];

  return (
    <section aria-label="Sơ đồ khu vực chỗ ngồi tương tác" className={className}>
      <div
        className="w-full overflow-auto flex items-center justify-center"
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={containerRef}
          className="w-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
          dangerouslySetInnerHTML={{ __html: svgText ?? '' }}
        />
      </div>
      <ZoneTicketTypesPanel
        zone={peekedOrSelectedZone}
        ticketTypes={panelTicketTypes}
        className="border-t border-border/60 px-4 py-3"
      />
    </section>
  );
}
