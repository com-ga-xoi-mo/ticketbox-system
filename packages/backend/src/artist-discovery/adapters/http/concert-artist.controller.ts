import { Controller, Put, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { SetConcertArtistsUseCase } from '../../application/use-cases/set-concert-artists.use-case';
import { ReplaceConcertArtistsRequestSchema } from '@ticketbox/api-types';
import { mapConcertErrors } from '../../../concert-management/adapters/http/concert-error.mapper';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConcertArtistController {
  constructor(private readonly setConcertArtists: SetConcertArtistsUseCase) {}

  @Put('organizer/concerts/:id/artists')
  @Roles(Role.ORGANIZER)
  async setOrganizerConcertArtists(
    @Param('id') concertId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    let dto;
    try {
      dto = ReplaceConcertArtistsRequestSchema.parse(body);
    } catch (err) {
      throw new BadRequestException('Invalid request body', { cause: err });
    }
    const user = req.user as any;
    await mapConcertErrors(() =>
      this.setConcertArtists.execute({
        concertId,
        artists: dto.artists,
        actor: { userId: user.id, roles: user.roles || [] },
        allowAdminOverride: false,
      }),
    );
    return { success: true };
  }

  @Put('admin/concerts/:id/artists')
  @Roles(Role.ADMIN)
  async setAdminConcertArtists(
    @Param('id') concertId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    let dto;
    try {
      dto = ReplaceConcertArtistsRequestSchema.parse(body);
    } catch (err) {
      throw new BadRequestException('Invalid request body', { cause: err });
    }
    const user = req.user as any;
    await mapConcertErrors(() =>
      this.setConcertArtists.execute({
        concertId,
        artists: dto.artists,
        actor: { userId: user.id, roles: user.roles || [] },
        allowAdminOverride: true,
      }),
    );
    return { success: true };
  }
}
