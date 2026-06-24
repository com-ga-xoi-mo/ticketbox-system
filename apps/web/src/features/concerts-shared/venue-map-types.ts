export interface SeatingMapMetadata {
  assetId: string;
  url: string;
  svgElementIds: string[];
}

export interface SeatingZone {
  id: string;
  concertId: string;
  svgElementId: string;
  label: string;
  color?: string;
  displayOrder: number;
  status?: string;
}

export interface ZoneMapping {
  seatingZoneId: string;
  svgElementId: string;
  label: string;
}

export interface TicketType {
  id: string;
  concertId: string;
  code: string;
  name: string;
  description?: string;
  priceVnd: number;
  totalQuantity: number;
  saleStartsAt: string;
  saleEndsAt: string;
  maxPerUser: number;
  mappedZones: ZoneMapping[];
  status?: string;
}

export interface VenueMapEditorState {
  concertId: string;
  seatingMap: SeatingMapMetadata | null;
  seatingZones: SeatingZone[];
  ticketTypes: TicketType[];
  isLoading: boolean;
  isReadOnly: boolean;
}
