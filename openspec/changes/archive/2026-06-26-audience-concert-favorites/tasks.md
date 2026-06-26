## 1. Database & Infrastructure

- [x] 1.1 Update `schema.prisma` with `FavoriteConcert` model and run migration.
- [x] 1.2 Create `FavoriteRepositoryPort` in `packages/backend/src/favorites/domain/ports/favorite-repository.port.ts`.
- [x] 1.3 Create `PrismaFavoriteRepository` in `packages/backend/src/favorites/infrastructure/database/prisma-favorite-concert.repository.ts`.

## 2. Backend Application & Adapters

- [x] 2.1 Create `ToggleFavoriteUseCase`.
- [x] 2.2 Create `GetMyFavoritesUseCase`.
- [x] 2.3 Create `CheckFavoriteStatusUseCase`.
- [x] 2.4 Create `FavoritesController` with POST and GET endpoints.
- [x] 2.5 Create `FavoritesModule`, provide the repository token, and export the use cases.
- [x] 2.6 Import `FavoritesModule` into the root `AppModule` or `BackendCoreModule`.

## 3. Frontend Integration

- [x] 3.1 Add API calls (`toggleFavorite`, `getMyFavorites`, `checkFavoriteStatus`) to `apps/audience-web/src/shared/api/`.
- [x] 3.2 Update `ConcertCard` component to include a Favorite toggle button.
- [x] 3.3 Update `EventDetailPage` to include a Favorite toggle button.
- [x] 3.4 Create `FavoritesPage` and register the route `/me/favorites`.
