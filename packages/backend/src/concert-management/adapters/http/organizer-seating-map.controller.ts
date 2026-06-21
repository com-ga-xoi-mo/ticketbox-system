import {
  Body,
  Controller,
  Param,
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
import { UpdateTicketTypeZoneMappingsUseCase } from '../../application/use-cases/update-ticket-type-zone-mappings.use-case';
import { UploadSeatingMapUseCase } from '../../application/use-cases/upload-seating-map.use-case';
import { UpsertSeatingZonesUseCase } from '../../application/use-cases/upsert-seating-zones.use-case';
import { mapSeatingMapErrors } from './seating-map-error.mapper';
import { UpdateZoneMappingsDto } from './dto/update-zone-mappings.dto';
import { UpsertSeatingZonesDto } from './dto/upsert-seating-zones.dto';
import type { UploadedMemoryFile } from './upload-file.type';

@Controller('organizer/concerts/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizerSeatingMapController {
  constructor(
    private readonly uploadSeatingMapUseCase: UploadSeatingMapUseCase,
    private readonly upsertSeatingZonesUseCase: UpsertSeatingZonesUseCase,
    private readonly updateTicketTypeZoneMappingsUseCase: UpdateTicketTypeZoneMappingsUseCase,
  ) {}

  @Post('seating-map')
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
        allowAdminOverride: false,
        fileBuffer: file?.buffer ?? Buffer.alloc(0),
        originalName: file?.originalname ?? '',
        mimeType: file?.mimetype ?? '',
        sizeBytes: file?.size ?? 0,
      }),
    );
  }

  @Put('seating-zones')
  async upsertZones(
    @Param('id') concertId: string,
    @Body() dto: UpsertSeatingZonesDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return mapSeatingMapErrors(() =>
      this.upsertSeatingZonesUseCase.execute({
        concertId,
        userId: req.user.id,
        allowAdminOverride: false,
        zones: dto.zones,
      }),
    );
  }

  @Put('ticket-types/:typeId/zone-mappings')
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
        allowAdminOverride: false,
        seatingZoneIds: dto.seatingZoneIds,
      }),
    );
  }
}
