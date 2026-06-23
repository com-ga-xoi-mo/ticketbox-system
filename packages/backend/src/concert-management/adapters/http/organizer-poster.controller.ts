import {
  Controller,
  Param,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { UploadPosterUseCase } from '../../application/use-cases/upload-poster.use-case';
import { mapPosterErrors } from './poster-error.mapper';
import type { UploadedMemoryFile } from './upload-file.type';

@Controller('organizer/concerts/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
export class OrganizerPosterController {
  constructor(private readonly uploadPosterUseCase: UploadPosterUseCase) {}

  @Post('poster')
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
        allowAdminOverride: false,
        fileBuffer: file?.buffer ?? Buffer.alloc(0),
        originalName: file?.originalname ?? '',
        mimeType: file?.mimetype ?? '',
        sizeBytes: file?.size ?? 0,
      }),
    );
  }
}
