export enum ArtistStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface ArtistRecord {
  id: string;
  slug: string;
  displayName: string;
  bio: string | null;
  avatarAssetId: string | null;
  posterAssetId: string | null;
  status: ArtistStatus;
  followerCount: number;
  favoriteCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArtistSummary {
  id: string;
  slug: string;
  displayName: string;
  avatarAssetId: string | null;
  favoriteCount: number;
}

export interface ArtistProfile extends ArtistRecord {
  // Extending ArtistRecord directly
}

export interface ConcertArtistRecord {
  concertId: string;
  artistId: string;
  displayOrder: number;
  createdAt: Date;
}

export interface ArtistFollowRecord {
  id: string;
  userId: string;
  artistId: string;
  createdAt: Date;
}

export interface ArtistFavoriteRecord {
  id: string;
  userId: string;
  artistId: string;
  createdAt: Date;
}
