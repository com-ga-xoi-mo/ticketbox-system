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
import { ArchiveTicketTypeUseCase } from '../../application/use-cases/archive-ticket-type.use-case';
import { CreateTicketTypeUseCase } from '../../application/use-cases/create-ticket-type.use-case';
import { UpdateTicketTypeUseCase } from '../../application/use-cases/update-ticket-type.use-case';
import { ListTicketTypesWithZoneMappingsUseCase } from '../../application/use-cases/list-ticket-types-with-zone-mappings.use-case';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { mapConcertErrors } from './concert-error.mapper';

@Controller('organizer/concerts/:id/ticket-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizerTicketTypeController {
  constructor(
    private readonly createTicketTypeUseCase: CreateTicketTypeUseCase,
    private readonly updateTicketTypeUseCase: UpdateTicketTypeUseCase,
    private readonly archiveTicketTypeUseCase: ArchiveTicketTypeUseCase,
    private readonly listTicketTypesWithZoneMappingsUseCase: ListTicketTypesWithZoneMappingsUseCase,
  ) {}

  @Get()
  async getTicketTypes(
    @Param('id') concertId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapConcertErrors(() =>
      this.listTicketTypesWithZoneMappingsUseCase.execute({
        concertId,
        userId: req.user.id,
        allowAdminOverride: false,
      }),
    );
  }

  @Post()
  async create(
    @Param('id') concertId: string,
    @Body() dto: CreateTicketTypeDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapConcertErrors(() =>
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
    return mapConcertErrors(() =>
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
    return mapConcertErrors(() =>
      this.archiveTicketTypeUseCase.execute({
        concertId,
        ticketTypeId: typeId,
        requesterId: req.user.id,
        requesterRole: Role.ORGANIZER,
        allowAdminOverride: false,
      }),
    );
  }
}
