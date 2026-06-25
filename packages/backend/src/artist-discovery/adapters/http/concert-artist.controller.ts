import { Controller, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { SetConcertArtistsUseCase } from '../../application/use-cases/set-concert-artists.use-case';

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
    const user = req.user as any;
    await this.setConcertArtists.execute({
      concertId,
      artists: body.artists,
      actor: { userId: user.id, roles: user.roles?.map((r: any) => r.code) || [] },
      allowAdminOverride: false,
    });
    return { success: true };
  }

  @Put('admin/concerts/:id/artists')
  @Roles(Role.ADMIN)
  async setAdminConcertArtists(
    @Param('id') concertId: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    await this.setConcertArtists.execute({
      concertId,
      artists: body.artists,
      actor: { userId: user.id, roles: user.roles?.map((r: any) => r.code) || [] },
      allowAdminOverride: true,
    });
    return { success: true };
  }
}
