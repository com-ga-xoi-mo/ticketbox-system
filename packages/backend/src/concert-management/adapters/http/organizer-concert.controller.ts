import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Role } from '../../../identity/domain/role.enum';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { CancelConcertUseCase } from '../../application/use-cases/cancel-concert.use-case';
import { CreateConcertUseCase } from '../../application/use-cases/create-concert.use-case';
import { PublishConcertUseCase } from '../../application/use-cases/publish-concert.use-case';
import { UpdateConcertUseCase } from '../../application/use-cases/update-concert.use-case';
import { ListOrganizerConcertsUseCase } from '../../application/use-cases/list-organizer-concerts.use-case';
import { GetOrganizerConcertUseCase } from '../../application/use-cases/get-organizer-concert.use-case';
import { UploadBannerUseCase } from '../../application/use-cases/upload-banner.use-case';
import { mapConcertErrors } from './concert-error.mapper';
import { RateLimited } from '../../../platform/rate-limiting/rate-limit.decorator';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';
import { mapPosterErrors } from './poster-error.mapper';
import { mapToManagementConcertResponse } from './management-concert.mapper';

import {
  OrganizerCreateConcertSchema,
  OrganizerUpdateConcertSchema,
} from '@ticketbox/api-types';

@Controller('organizer/concerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizerConcertController {
  constructor(
    private readonly createConcertUseCase: CreateConcertUseCase,
    private readonly updateConcertUseCase: UpdateConcertUseCase,
    private readonly publishConcertUseCase: PublishConcertUseCase,
    private readonly cancelConcertUseCase: CancelConcertUseCase,
    private readonly listOrganizerConcertsUseCase: ListOrganizerConcertsUseCase,
    private readonly getOrganizerConcertUseCase: GetOrganizerConcertUseCase,
    private readonly uploadBannerUseCase: UploadBannerUseCase,
  ) {}

  @Get()
  async list(@Request() req: { user: AuthenticatedUser }) {
    const concerts = await mapConcertErrors(() => this.listOrganizerConcertsUseCase.execute(req.user.id));
    return concerts.map(mapToManagementConcertResponse);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    const concert = await mapConcertErrors(() =>
      this.getOrganizerConcertUseCase.execute({
        concertId: id,
        organizerId: req.user.id,
      }),
    );
    return mapToManagementConcertResponse(concert);
  }

  @Post()
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async create(@Body() body: any, @Request() req: { user: AuthenticatedUser }) {
    let dto;
    try {
      dto = OrganizerCreateConcertSchema.parse(body);
    } catch (err: any) {
      throw new BadRequestException('Invalid request body', { cause: err });
    }

    const concert = await mapConcertErrors(() =>
      this.createConcertUseCase.execute({
        createdById: req.user.id,
        slug: dto.slug,
        title: dto.title,
        artistName: dto.artistName,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        city: dto.city,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        description: dto.description,
        eventType: dto.eventType,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoImageUrl: dto.seoImageUrl,
      }),
    );
    return mapToManagementConcertResponse(concert);
  }

  @Patch(':id')
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: { user: AuthenticatedUser },
  ) {
    let dto;
    try {
      dto = OrganizerUpdateConcertSchema.parse(body);
    } catch (err: any) {
      throw new BadRequestException('Invalid request body', { cause: err });
    }

    const concert = await mapConcertErrors(() =>
      this.updateConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
        title: dto.title,
        artistName: dto.artistName,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        latitude: 'latitude' in dto ? dto.latitude : undefined,
        longitude: 'longitude' in dto ? dto.longitude : undefined,
        city: dto.city,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        description: dto.description,
        slug: dto.slug,
        eventType: dto.eventType,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        seoImageUrl: dto.seoImageUrl,
      }),
    );
    return mapToManagementConcertResponse(concert);
  }

  @Post(':id/publish')
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async publish(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() =>
      this.publishConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
      }),
    );
  }

  @Post(':id/cancel')
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async cancel(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() =>
      this.cancelConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
      }),
    );
  }

  @Post(':id/banner')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: Number(process.env.POSTER_IMAGE_MAX_BYTES ?? 5_242_880) },
    }),
  )
  async uploadBanner(
    @Param('id') concertId: string,
    @UploadedFile() file: any,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapPosterErrors(() =>
      this.uploadBannerUseCase.execute({
        concertId,
        userId: req.user.id,
        allowAdminOverride: false,
        fileBuffer: file?.buffer ?? Buffer.alloc(0),
        originalName: file?.originalname ?? '',
        mimeType: file?.mimetype ?? '',
        sizeBytes: file?.size ?? 0,
      }),
    );
  }
}
