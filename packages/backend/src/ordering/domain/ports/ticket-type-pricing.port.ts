export interface TicketTypePricingRecord {
  ticketTypeId: string;
  ticketTypeName: string;
  concertId: string;
  unitPriceVnd: number;
}

export const TICKET_TYPE_PRICING_REPOSITORY = Symbol('TicketTypePricingRepository');

export interface TicketTypePricingRepositoryPort {
  findPricingByConcertAndTicketTypeIds(
    concertId: string,
    ticketTypeIds: string[],
  ): Promise<TicketTypePricingRecord[]>;
}
