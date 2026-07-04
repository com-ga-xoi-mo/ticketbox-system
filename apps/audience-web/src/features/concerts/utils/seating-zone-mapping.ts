import type { PublicSeatingZone, PublicTicketType } from '@ticketbox/api-types';

export function getTicketTypesForZone(
  zoneId: string,
  ticketTypes: PublicTicketType[],
): PublicTicketType[] {
  return ticketTypes.filter((tt) => tt.zoneIds.includes(zoneId));
}

export function getZoneLabelsForTicketType(
  ticketType: Pick<PublicTicketType, 'zoneIds'>,
  seatingZones: PublicSeatingZone[],
): string[] {
  return seatingZones
    .filter((zone) => ticketType.zoneIds.includes(zone.id))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((zone) => zone.label);
}

export function buildSvgElementIdIndex(
  seatingZones: PublicSeatingZone[],
): Map<string, PublicSeatingZone> {
  return new Map(seatingZones.map((zone) => [zone.svgElementId, zone]));
}

export function isZoneHighlighted(
  zone: PublicSeatingZone,
  selectedZoneId: string | null,
  activeTicketTypeId: string | null,
  ticketTypes: PublicTicketType[],
): boolean {
  if (selectedZoneId === zone.id) return true;
  if (!activeTicketTypeId) return false;
  const ticketType = ticketTypes.find((tt) => tt.id === activeTicketTypeId);
  return Boolean(ticketType?.zoneIds.includes(zone.id));
}
