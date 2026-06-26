export interface FavoriteConcertReadModel {
  id: string;
  title: string;
  slug: string;
  artistName: string;
  startsAt: Date;
  endsAt: Date;
  venueName: string;
  city: string;
  posterUrl: string | null;
  favoritedAt: Date;
}

export abstract class FavoriteRepositoryPort {
  abstract toggleFavorite(
    userId: string,
    concertId: string,
  ): Promise<{ isFavorited: boolean }>;

  abstract isFavorited(
    userId: string,
    concertId: string,
  ): Promise<boolean>;

  abstract listByUser(userId: string): Promise<FavoriteConcertReadModel[]>;
}
