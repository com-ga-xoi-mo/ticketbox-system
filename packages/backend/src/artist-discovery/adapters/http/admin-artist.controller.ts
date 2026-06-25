import { Controller, Post, Patch, Param, Body, UseGuards, UseInterceptors, UploadedFile, Req } from '@nestjs/common';
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
import { ArtistStatus } from '../../domain/artist.types';

@Controller('admin/artists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminArtistController {
  constructor(
    private readonly createArtist: CreateArtistUseCase,
    private readonly updateArtist: UpdateArtistUseCase,
    private readonly uploadAvatar: UploadArtistAvatarUseCase,
    private readonly uploadPoster: UploadArtistPosterUseCase,
  ) {}

  @Post()
  async create(@Body() body: any) {
    return this.createArtist.execute({
      slug: body.slug,
      displayName: body.displayName,
      bio: body.bio,
      status: body.status,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.updateArtist.execute({
      id,
      slug: body.slug,
      displayName: body.displayName,
      bio: body.bio,
      status: body.status,
    });
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async avatar(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    await this.uploadAvatar.execute({
      artistId: id,
      originalName: file.originalname,
      contentType: file.mimetype,
      content: file.buffer,
      uploadedById: (req.user as any).id,
    });
    return { success: true };
  }

  @Post(':id/poster')
  @UseInterceptors(FileInterceptor('file'))
  async poster(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    await this.uploadPoster.execute({
      artistId: id,
      originalName: file.originalname,
      contentType: file.mimetype,
      content: file.buffer,
      uploadedById: (req.user as any).id,
    });
    return { success: true };
  }
}
