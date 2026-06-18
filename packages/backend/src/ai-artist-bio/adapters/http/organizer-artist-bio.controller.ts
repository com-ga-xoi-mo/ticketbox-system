import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { GetArtistBioJobUseCase } from '../../application/use-cases/get-artist-bio-job.use-case';
import { PublishArtistBioUseCase } from '../../application/use-cases/publish-artist-bio.use-case';
import { RejectArtistBioUseCase } from '../../application/use-cases/reject-artist-bio.use-case';
import { RequestArtistBioUseCase } from '../../application/use-cases/request-artist-bio.use-case';
import { RetryArtistBioJobUseCase } from '../../application/use-cases/retry-artist-bio-job.use-case';
import { handleArtistBioHttpErrors } from './artist-bio-error.mapper';
import { toArtistBioResponse } from './artist-bio-response.mapper';
import { UploadArtistBioPressKitDto } from './dto/upload-artist-bio-press-kit.dto';

@Controller('organizer/concerts/:concertId/artist-bio')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizerArtistBioController {
  constructor(
    private readonly requestArtistBio: RequestArtistBioUseCase,
    private readonly getArtistBioJob: GetArtistBioJobUseCase,
    private readonly retryArtistBioJob: RetryArtistBioJobUseCase,
    private readonly publishArtistBio: PublishArtistBioUseCase,
    private readonly rejectArtistBio: RejectArtistBioUseCase,
  ) {}

  @Post()
  async upload(
    @Param('concertId') concertId: string,
    @Body() dto: UploadArtistBioPressKitDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return handleArtistBioHttpErrors(async () => {
      const record = await this.requestArtistBio.execute({
        concertId,
        actor: { userId: req.user.id, roles: req.user.roles },
        allowAdminOverride: false,
        upload: {
          originalName: dto.originalName,
          contentType: dto.contentType,
          content: Buffer.from(dto.contentBase64, 'base64'),
        },
      });
      return toArtistBioResponse(record);
    });
  }

  @Get()
  async getLatest(
    @Param('concertId') concertId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return handleArtistBioHttpErrors(async () => {
      const record = await this.getArtistBioJob.execute({
        concertId,
        actor: { userId: req.user.id, roles: req.user.roles },
        allowAdminOverride: false,
      });
      return toArtistBioResponse(record);
    });
  }

  @Post(':artistBioId/retry')
  async retry(
    @Param('concertId') concertId: string,
    @Param('artistBioId') artistBioId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return handleArtistBioHttpErrors(async () => {
      const record = await this.retryArtistBioJob.execute({
        concertId,
        artistBioId,
        actor: { userId: req.user.id, roles: req.user.roles },
        allowAdminOverride: false,
      });
      return toArtistBioResponse(record);
    });
  }

  @Post(':artistBioId/publish')
  async publish(
    @Param('concertId') concertId: string,
    @Param('artistBioId') artistBioId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return handleArtistBioHttpErrors(async () => {
      const record = await this.publishArtistBio.execute({
        concertId,
        artistBioId,
        actor: { userId: req.user.id, roles: req.user.roles },
        allowAdminOverride: false,
      });
      return toArtistBioResponse(record);
    });
  }

  @Post(':artistBioId/reject')
  async reject(
    @Param('concertId') concertId: string,
    @Param('artistBioId') artistBioId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return handleArtistBioHttpErrors(async () => {
      const record = await this.rejectArtistBio.execute({
        concertId,
        artistBioId,
        actor: { userId: req.user.id, roles: req.user.roles },
        allowAdminOverride: false,
      });
      return toArtistBioResponse(record);
    });
  }
}

