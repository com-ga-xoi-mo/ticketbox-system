import type { SeatingZone } from '../seating-map.types';

export const TICKET_TYPE_ZONE_REPOSITORY = Symbol('TICKET_TYPE_ZONE_REPOSITORY');

export interface TicketTypeZoneRepositoryPort {
  replaceForTicketType(
    concertId: string,
    ticketTypeId: string,
    seatingZoneIds: string[],
  ): Promise<SeatingZone[]>;
  findByTicketTypeId(ticketTypeId: string): Promise<SeatingZone[]>;
}
