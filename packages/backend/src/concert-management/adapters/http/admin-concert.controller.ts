import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { CreateTicketTypeUseCase } from '../../application/use-cases/create-ticket-type.use-case';
import { UpdateTicketTypeUseCase } from '../../application/use-cases/update-ticket-type.use-case';
import { ArchiveTicketTypeUseCase } from '../../application/use-cases/archive-ticket-type.use-case';
import { UpdateTicketTypeZoneMappingsUseCase } from '../../application/use-cases/update-ticket-type-zone-mappings.use-case';
import { UploadPosterUseCase } from '../../application/use-cases/upload-poster.use-case';
import { UploadSeatingMapUseCase } from '../../application/use-cases/upload-seating-map.use-case';
import { UpsertSeatingZonesUseCase } from '../../application/use-cases/upsert-seating-zones.use-case';
import { ListAdminConcertsUseCase } from '../../application/use-cases/list-admin-concerts.use-case';
import { GetAdminConcertUseCase } from '../../application/use-cases/get-admin-concert.use-case';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { UpdateZoneMappingsDto } from './dto/update-zone-mappings.dto';
import { UpsertSeatingZonesDto } from './dto/upsert-seating-zones.dto';
import { mapConcertErrors } from './concert-error.mapper';
import { mapPosterErrors } from './poster-error.mapper';
import { mapSeatingMapErrors } from './seating-map-error.mapper';
import type { UploadedMemoryFile } from './upload-file.type';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminConcertController {
  constructor(
    private readonly createConcertUseCase: CreateConcertUseCase,
    private readonly updateConcertUseCase: UpdateConcertUseCase,
    private readonly publishConcertUseCase: PublishConcertUseCase,
    private readonly cancelConcertUseCase: CancelConcertUseCase,
    private readonly createTicketTypeUseCase: CreateTicketTypeUseCase,
    private readonly updateTicketTypeUseCase: UpdateTicketTypeUseCase,
    private readonly archiveTicketTypeUseCase: ArchiveTicketTypeUseCase,
    private readonly uploadPosterUseCase: UploadPosterUseCase,
    private readonly uploadSeatingMapUseCase: UploadSeatingMapUseCase,
    private readonly upsertSeatingZonesUseCase: UpsertSeatingZonesUseCase,
    private readonly updateTicketTypeZoneMappingsUseCase: UpdateTicketTypeZoneMappingsUseCase,
    private readonly listAdminConcertsUseCase: ListAdminConcertsUseCase,
    private readonly getAdminConcertUseCase: GetAdminConcertUseCase,
  ) {}

  @Get('concerts')
  async list() {
    return mapConcertErrors(() => this.listAdminConcertsUseCase.execute());
  }

  @Get('concerts/:id')
  async get(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() =>
      this.getAdminConcertUseCase.execute({
        concertId: id,
        adminId: req.user.id,
      }),
    );
  }

  @Post('concerts')
  async create(@Body() dto: CreateConcertDto, @Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() =>
      this.createConcertUseCase.execute({
        createdById: req.user.id,
        slug: dto.slug,
        title: dto.title,
        artistName: dto.artistName,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        city: dto.city,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        description: dto.description,
      }),
    );
  }

  @Patch('concerts/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConcertDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapConcertErrors(() =>
      this.updateConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
        title: dto.title,
        artistName: dto.artistName,
        venueName: dto.venueName,
        venueAddress: dto.venueAddress,
        city: dto.city,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        description: dto.description,
        slug: dto.slug,
      }),
    );
  }

  @Post('concerts/:id/publish')
  async publish(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() =>
      this.publishConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
      }),
    );
  }

  @Post('concerts/:id/cancel')
  async cancel(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() =>
      this.cancelConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
      }),
    );
  }

  @Post('concerts/:id/ticket-types')
  async createTicketType(
    @Param('id') concertId: string,
    @Body() dto: CreateTicketTypeDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapConcertErrors(() =>
      this.createTicketTypeUseCase.execute({
        concertId,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        priceVnd: dto.priceVnd,
        totalQuantity: dto.totalQuantity,
        saleStartsAt: new Date(dto.saleStartsAt),
        saleEndsAt: new Date(dto.saleEndsAt),
        maxPerUser: dto.maxPerUser,
      }),
    );
  }

  @Patch('concerts/:id/ticket-types/:typeId')
  async updateTicketType(
    @Param('id') concertId: string,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateTicketTypeDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapConcertErrors(() =>
      this.updateTicketTypeUseCase.execute({
        concertId,
        ticketTypeId: typeId,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        priceVnd: dto.priceVnd,
        totalQuantity: dto.totalQuantity,
        saleStartsAt: dto.saleStartsAt ? new Date(dto.saleStartsAt) : undefined,
        saleEndsAt: dto.saleEndsAt ? new Date(dto.saleEndsAt) : undefined,
        maxPerUser: dto.maxPerUser,
        status: dto.status,
      }),
    );
  }

  @Patch('concerts/:id/ticket-types/:typeId/archive')
  async archiveTicketType(
    @Param('id') concertId: string,
    @Param('typeId') typeId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapConcertErrors(() =>
      this.archiveTicketTypeUseCase.execute({
        concertId,
        ticketTypeId: typeId,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
      }),
    );
  }

  @Post('concerts/:id/poster')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: Number(process.env.POSTER_IMAGE_MAX_BYTES ?? 5_242_880) },
    }),
  )
  async uploadPoster(
    @Param('id') concertId: string,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapPosterErrors(() =>
      this.uploadPosterUseCase.execute({
        concertId,
        userId: req.user.id,
        allowAdminOverride: true,
        fileBuffer: file?.buffer ?? Buffer.alloc(0),
        originalName: file?.originalname ?? '',
        mimeType: file?.mimetype ?? '',
        sizeBytes: file?.size ?? 0,
      }),
    );
  }

  @Post('concerts/:id/seating-map')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: Number(process.env.SEATING_MAP_SVG_MAX_BYTES ?? 5_242_880) },
    }),
  )
  async uploadSeatingMap(
    @Param('id') concertId: string,
    @UploadedFile() file: UploadedMemoryFile | undefined,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapSeatingMapErrors(() =>
      this.uploadSeatingMapUseCase.execute({
        concertId,
        userId: req.user.id,
        allowAdminOverride: true,
        fileBuffer: file?.buffer ?? Buffer.alloc(0),
        originalName: file?.originalname ?? '',
        mimeType: file?.mimetype ?? '',
        sizeBytes: file?.size ?? 0,
      }),
    );
  }

  @Put('concerts/:id/seating-zones')
  async upsertZones(
    @Param('id') concertId: string,
    @Body() dto: UpsertSeatingZonesDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapSeatingMapErrors(() =>
      this.upsertSeatingZonesUseCase.execute({
        concertId,
        userId: req.user.id,
        allowAdminOverride: true,
        zones: dto.zones,
      }),
    );
  }

  @Put('concerts/:id/ticket-types/:typeId/zone-mappings')
  async updateZoneMappings(
    @Param('id') concertId: string,
    @Param('typeId') ticketTypeId: string,
    @Body() dto: UpdateZoneMappingsDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapSeatingMapErrors(() =>
      this.updateTicketTypeZoneMappingsUseCase.execute({
        concertId,
        ticketTypeId,
        userId: req.user.id,
        allowAdminOverride: true,
        seatingZoneIds: dto.seatingZoneIds,
      }),
    );
  }

}
