import {
  ArtistRecord,
  ArtistStatus,
  ConcertArtistRecord,
  ArtistFollowRecord,
  ArtistFavoriteRecord,
} from '../artist.types';

export interface FindActiveArtistsParams {
  query?: string;
  limit: number;
  offset: number;
}

export interface PaginatedArtists {
  items: ArtistRecord[];
  total: number;
}

export interface SetConcertArtistsParams {
  concertId: string;
  artists: { artistId: string; displayOrder: number }[];
}

export interface ArtistRepositoryPort {
  findBySlug(slug: string): Promise<ArtistRecord | null>;
  findById(id: string): Promise<ArtistRecord | null>;
  findActive(params: FindActiveArtistsParams): Promise<PaginatedArtists>;
  findTopByFavorites(limit: number): Promise<ArtistRecord[]>;
  create(data: Omit<ArtistRecord, 'id' | 'createdAt' | 'updatedAt' | 'followerCount' | 'favoriteCount'>): Promise<ArtistRecord>;
  update(id: string, data: Partial<Omit<ArtistRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ArtistRecord>;
  findConcertArtists(concertId: string): Promise<ConcertArtistRecord[]>;
  setConcertArtists(params: SetConcertArtistsParams): Promise<void>;
  findFollow(userId: string, artistId: string): Promise<ArtistFollowRecord | null>;
  createFollow(userId: string, artistId: string): Promise<ArtistFollowRecord>;
  deleteFollow(userId: string, artistId: string): Promise<void>;
  findFavorite(userId: string, artistId: string): Promise<ArtistFavoriteRecord | null>;
  createFavorite(userId: string, artistId: string): Promise<ArtistFavoriteRecord>;
  deleteFavorite(userId: string, artistId: string): Promise<void>;
  incrementFollowerCount(artistId: string): Promise<void>;
  decrementFollowerCount(artistId: string): Promise<void>;
  incrementFavoriteCount(artistId: string): Promise<void>;
  decrementFavoriteCount(artistId: string): Promise<void>;
  findUpcomingEventsByArtist(artistId: string): Promise<any[]>; // Will refine with proper Concert entity later
  countPastEventsByArtist(artistId: string): Promise<number>;
}

export const ARTIST_REPOSITORY = Symbol('ARTIST_REPOSITORY');
