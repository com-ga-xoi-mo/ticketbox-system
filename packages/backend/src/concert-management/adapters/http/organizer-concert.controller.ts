import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

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
import { mapConcertErrors } from './concert-error.mapper';
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';

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
  ) {}

  @Get()
  async list(@Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() => this.listOrganizerConcertsUseCase.execute(req.user.id));
  }

  @Get(':id')
  async get(@Param('id') id: string, @Request() req: { user: AuthenticatedUser }) {
    return mapConcertErrors(() =>
      this.getOrganizerConcertUseCase.execute({
        concertId: id,
        organizerId: req.user.id,
      }),
    );
  }

  @Post()
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

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConcertDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapConcertErrors(() =>
      this.updateConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
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

  @Post(':id/publish')
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
}
