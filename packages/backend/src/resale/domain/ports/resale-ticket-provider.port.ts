export const RESALE_TICKET_PROVIDER = Symbol('RESALE_TICKET_PROVIDER');

export interface IResaleTicketProvider {
  findTicketById(id: string): Promise<any>;
}
