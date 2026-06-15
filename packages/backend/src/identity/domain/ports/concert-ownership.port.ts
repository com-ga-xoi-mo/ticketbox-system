export const CONCERT_OWNERSHIP_REPOSITORY = Symbol('ConcertOwnershipRepository');

export interface ConcertOwnershipRecord {
  concertId: string;
  ownerUserId: string;
}

export interface ConcertOwnershipRepositoryPort {
  findOwnership(concertId: string): Promise<ConcertOwnershipRecord | null>;
}
