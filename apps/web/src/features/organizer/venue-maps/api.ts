import { get, post, patch, postFormData, put } from '../../../shared/api/client';
import type { SeatingMapMetadata, SeatingZone, TicketType } from '../../concerts-shared/venue-map-types';

export const ORGANIZER_CONCERTS_PATH = '/organizer/concerts';

export async function getSeatingMap(concertId: string): Promise<SeatingMapMetadata | null> {
  return get<SeatingMapMetadata | null>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/seating-map`);
}

export async function getSeatingZones(concertId: string): Promise<SeatingZone[]> {
  return get<SeatingZone[]>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/seating-zones`);
}

export async function getTicketTypes(concertId: string): Promise<TicketType[]> {
  return get<TicketType[]>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/ticket-types`);
}

export async function uploadSeatingMap(concertId: string, file: File): Promise<SeatingMapMetadata> {
  const formData = new FormData();
  formData.append('file', file);
  return postFormData<SeatingMapMetadata>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/seating-map`, formData);
}

export async function saveSeatingZones(concertId: string, payload: { zones: Omit<SeatingZone, 'id' | 'concertId'>[] }): Promise<SeatingZone[]> {
  return patch<SeatingZone[]>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/seating-zones`, payload);
}

export async function createTicketType(concertId: string, payload: Omit<TicketType, 'id' | 'concertId'>): Promise<TicketType> {
  return post<TicketType>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/ticket-types`, payload);
}

export async function updateTicketType(concertId: string, ticketTypeId: string, payload: Partial<Omit<TicketType, 'id' | 'concertId'>>): Promise<TicketType> {
  return patch<TicketType>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/ticket-types/${ticketTypeId}`, payload);
}

export async function archiveTicketType(concertId: string, ticketTypeId: string): Promise<void> {
  return patch<void>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/ticket-types/${ticketTypeId}/archive`, {});
}

export async function mapZonesToTicketType(concertId: string, ticketTypeId: string, payload: { seatingZoneIds: string[] }): Promise<TicketType> {
  return put<TicketType>(`${ORGANIZER_CONCERTS_PATH}/${concertId}/ticket-types/${ticketTypeId}/zone-mappings`, payload);
}
