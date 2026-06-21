import type { SeatingZone, UpsertSeatingZoneInput } from '../seating-map.types';

export const SEATING_ZONE_REPOSITORY = Symbol('SEATING_ZONE_REPOSITORY');

export interface SeatingZoneRepositoryPort {
  upsertMany(concertId: string, zones: UpsertSeatingZoneInput[]): Promise<SeatingZone[]>;
  findByConcertId(concertId: string): Promise<SeatingZone[]>;
  findByIds(ids: string[]): Promise<SeatingZone[]>;
}
