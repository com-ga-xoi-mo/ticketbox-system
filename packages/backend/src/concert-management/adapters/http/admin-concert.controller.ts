import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import {
  ConcertNotFoundError,
  ForbiddenConcertOwnershipError,
} from '../../../identity/domain/errors';
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
import { CreateConcertDto } from './dto/create-concert.dto';
import { UpdateConcertDto } from './dto/update-concert.dto';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

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
  ) {}

  @Post('concerts')
  async create(
    @Body() dto: CreateConcertDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleErrors(() =>
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
    return this.handleErrors(() =>
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
      }),
    );
  }

  @Post('concerts/:id/publish')
  async publish(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleErrors(() =>
      this.publishConcertUseCase.execute({
        concertId: id,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
      }),
    );
  }

  @Post('concerts/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleErrors(() =>
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
    return this.handleErrors(() =>
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
    return this.handleErrors(() =>
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
    return this.handleErrors(() =>
      this.archiveTicketTypeUseCase.execute({
        concertId,
        ticketTypeId: typeId,
        requesterId: req.user.id,
        requesterRole: Role.ADMIN,
        allowAdminOverride: true,
      }),
    );
  }

  private async handleErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err: unknown) {
      if (err instanceof ForbiddenConcertOwnershipError) {
        throw new ForbiddenException(err.message);
      }
      if (err instanceof ConcertNotFoundError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
