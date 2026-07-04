import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { CreateArtistUseCase } from '../../application/use-cases/create-artist.use-case';
import { UpdateArtistUseCase } from '../../application/use-cases/update-artist.use-case';
import { UploadArtistAvatarUseCase } from '../../application/use-cases/upload-artist-avatar.use-case';
import { UploadArtistPosterUseCase } from '../../application/use-cases/upload-artist-poster.use-case';
import { ListAdminArtistsUseCase } from '../../application/use-cases/list-admin-artists.use-case';
import { ArtistStatus } from '../../domain/artist.types';
import { mapToManagementArtistResponse } from './management-artist.mapper';
import {
  AdminArtistSearchParamsSchema,
  AdminCreateArtistSchema,
  AdminUpdateArtistSchema,
} from '@ticketbox/api-types';

@Controller('admin/artists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminArtistController {
  constructor(
    private readonly listAdminArtists: ListAdminArtistsUseCase,
    private readonly createArtist: CreateArtistUseCase,
    private readonly updateArtist: UpdateArtistUseCase,
    private readonly uploadAvatar: UploadArtistAvatarUseCase,
    private readonly uploadPoster: UploadArtistPosterUseCase,
  ) {}

  @Get()
  async list(@Query() query: any) {
    let params;
    try {
      params = AdminArtistSearchParamsSchema.parse(query || {});
    } catch (err: any) {
      throw new BadRequestException('Invalid query parameters', { cause: err });
    }

    const result = await this.listAdminArtists.execute({
      query: params.q,
      status: params.status as any,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    });

    return {
      items: result.items.map(mapToManagementArtistResponse),
      total: result.total,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };
  }

  @Post()
  async create(@Body() body: any) {
    let dto;
    try {
      dto = AdminCreateArtistSchema.parse(body);
    } catch (err: any) {
      throw new BadRequestException('Invalid request body', { cause: err });
    }

    const artist = await this.createArtist.execute({
      slug: dto.slug,
      displayName: dto.displayName,
      bio: dto.bio,
      status: dto.status as any,
    });

    return mapToManagementArtistResponse(artist);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    let dto;
    try {
      dto = AdminUpdateArtistSchema.parse(body);
    } catch (err: any) {
      throw new BadRequestException('Invalid request body', { cause: err });
    }

    const artist = await this.updateArtist.execute({
      id,
      slug: dto.slug,
      displayName: dto.displayName,
      bio: dto.bio,
      status: dto.status as any,
    });

    return mapToManagementArtistResponse(artist);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: Number(process.env.AVATAR_IMAGE_MAX_BYTES ?? 5_242_880) },
  }))
  async avatar(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    const result = await this.uploadAvatar.execute({
      artistId: id,
      originalName: file.originalname,
      contentType: file.mimetype,
      content: file.buffer,
      uploadedById: (req.user as any).id,
    });
    return { assetId: result.id, publicUrl: result.publicUrl };
  }

  @Post(':id/poster')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: Number(process.env.POSTER_IMAGE_MAX_BYTES ?? 5_242_880) },
  }))
  async poster(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    const result = await this.uploadPoster.execute({
      artistId: id,
      originalName: file.originalname,
      contentType: file.mimetype,
      content: file.buffer,
      uploadedById: (req.user as any).id,
    });
    return { assetId: result.id, publicUrl: result.publicUrl };
  }
}
