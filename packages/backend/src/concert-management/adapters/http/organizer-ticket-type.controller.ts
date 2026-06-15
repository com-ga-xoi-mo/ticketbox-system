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
import { ArchiveTicketTypeUseCase } from '../../application/use-cases/archive-ticket-type.use-case';
import { CreateTicketTypeUseCase } from '../../application/use-cases/create-ticket-type.use-case';
import { UpdateTicketTypeUseCase } from '../../application/use-cases/update-ticket-type.use-case';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

@Controller('organizer/concerts/:id/ticket-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizerTicketTypeController {
  constructor(
    private readonly createTicketTypeUseCase: CreateTicketTypeUseCase,
    private readonly updateTicketTypeUseCase: UpdateTicketTypeUseCase,
    private readonly archiveTicketTypeUseCase: ArchiveTicketTypeUseCase,
  ) {}

  @Post()
  async create(
    @Param('id') concertId: string,
    @Body() dto: CreateTicketTypeDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleErrors(() =>
      this.createTicketTypeUseCase.execute({
        concertId,
        requesterId: req.user.id,
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
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

  @Patch(':typeId')
  async update(
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
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
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

  @Patch(':typeId/archive')
  async archive(
    @Param('id') concertId: string,
    @Param('typeId') typeId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleErrors(() =>
      this.archiveTicketTypeUseCase.execute({
        concertId,
        ticketTypeId: typeId,
        requesterId: req.user.id,
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
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
