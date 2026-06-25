import { Module } from '@nestjs/common';
import { PrismaArtistRepository } from './infrastructure/database/prisma-artist.repository';
import { ARTIST_REPOSITORY } from './domain/ports/artist-repository.port';
import { ListArtistsUseCase } from './application/use-cases/list-artists.use-case';
import { GetArtistProfileUseCase } from './application/use-cases/get-artist-profile.use-case';
import { GetTopArtistsUseCase } from './application/use-cases/get-top-artists.use-case';
import { FollowArtistUseCase } from './application/use-cases/follow-artist.use-case';
import { UnfollowArtistUseCase } from './application/use-cases/unfollow-artist.use-case';
import { FavoriteArtistUseCase } from './application/use-cases/favorite-artist.use-case';
import { UnfavoriteArtistUseCase } from './application/use-cases/unfavorite-artist.use-case';
import { CreateArtistUseCase } from './application/use-cases/create-artist.use-case';
import { UpdateArtistUseCase } from './application/use-cases/update-artist.use-case';
import { SetConcertArtistsUseCase } from './application/use-cases/set-concert-artists.use-case';
import { UploadArtistAvatarUseCase } from './application/use-cases/upload-artist-avatar.use-case';
import { UploadArtistPosterUseCase } from './application/use-cases/upload-artist-poster.use-case';
import { PublicArtistController } from './adapters/http/public-artist.controller';
import { AudienceArtistController } from './adapters/http/audience-artist.controller';
import { AdminArtistController } from './adapters/http/admin-artist.controller';
import { ConcertArtistController } from './adapters/http/concert-artist.controller';
import { PrismaClient } from '@prisma/client';
import { ObjectStoragePort, OBJECT_STORAGE } from '../platform/storage/object-storage.port';
import { AuthorizeConcertManagementUseCase } from '../identity/application/use-cases/authorize-concert-management.use-case';
import { AuthModule } from '../identity/auth.module';
import { PrismaService } from '../platform/database/prisma.service';
import { DatabaseModule } from '../platform/database/database.module';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [
    PublicArtistController,
    AudienceArtistController,
    AdminArtistController,
    ConcertArtistController,
  ],
  providers: [
    {
      provide: ARTIST_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaArtistRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ListArtistsUseCase,
      useFactory: (repo) => new ListArtistsUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: GetArtistProfileUseCase,
      useFactory: (repo) => new GetArtistProfileUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: GetTopArtistsUseCase,
      useFactory: (repo) => new GetTopArtistsUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: FollowArtistUseCase,
      useFactory: (repo) => new FollowArtistUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: UnfollowArtistUseCase,
      useFactory: (repo) => new UnfollowArtistUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: FavoriteArtistUseCase,
      useFactory: (repo) => new FavoriteArtistUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: UnfavoriteArtistUseCase,
      useFactory: (repo) => new UnfavoriteArtistUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: CreateArtistUseCase,
      useFactory: (repo) => new CreateArtistUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: UpdateArtistUseCase,
      useFactory: (repo) => new UpdateArtistUseCase(repo),
      inject: [ARTIST_REPOSITORY],
    },
    {
      provide: SetConcertArtistsUseCase,
      useFactory: (repo, auth) => new SetConcertArtistsUseCase(repo, auth),
      inject: [ARTIST_REPOSITORY, AuthorizeConcertManagementUseCase],
    },
    {
      provide: UploadArtistAvatarUseCase,
      useFactory: (repo, storage) => new UploadArtistAvatarUseCase(repo, storage),
      inject: [ARTIST_REPOSITORY, OBJECT_STORAGE],
    },
    {
      provide: UploadArtistPosterUseCase,
      useFactory: (repo, storage) => new UploadArtistPosterUseCase(repo, storage),
      inject: [ARTIST_REPOSITORY, OBJECT_STORAGE],
    },
  ],
  exports: [ARTIST_REPOSITORY],
})
export class ArtistDiscoveryModule {}
