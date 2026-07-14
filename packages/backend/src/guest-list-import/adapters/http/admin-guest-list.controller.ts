import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import type { AdminGuestListUploadRequest } from '@ticketbox/api-types';
import { GuestListBatchNotCompletedError } from '../../domain/errors';
import { AuthorizeAdminActionUseCase } from '../../../identity/application/use-cases/authorize-admin-action.use-case';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { ClaimGuestListImportUseCase } from '../../application/use-cases/claim-guest-list-import.use-case';
import { DiscoverGuestListFilesUseCase } from '../../application/use-cases/discover-guest-list-files.use-case';
import { GetGuestListBatchesUseCase } from '../../application/use-cases/get-guest-list-batches.use-case';
import { AdminGuestListUploadRequestPipe } from './dto/admin-guest-list-upload.pipe';
import { RateLimited } from '../../../platform/rate-limiting/rate-limit.decorator';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';
import {
  toAdminGuestListUploadResponse,
  toGuestListBatchNotCompletedError,
  toGuestListReport,
  toPublicGuestListBatch,
} from './admin-guest-list.mapper';

@Controller('admin/concerts/:concertId/guest-list')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminGuestListController {
  constructor(
    private readonly claim: ClaimGuestListImportUseCase,
    private readonly discovery: DiscoverGuestListFilesUseCase,
    private readonly batches: GetGuestListBatchesUseCase,
    private readonly authorizeAdmin: AuthorizeAdminActionUseCase,
  ) {}
  @Post('imports')
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async requestImport(
    @Param('concertId') concertId: string,
    @Body(AdminGuestListUploadRequestPipe) dto: AdminGuestListUploadRequest,
    @Request() req: { user: AuthenticatedUser },
  ) {
    this.authorizeAdmin.execute({ userId: req.user.id, roles: req.user.roles });
    const result = await this.claim.execute({
      concertId,
      sourceName: dto.sourceName,
      contentType: dto.contentType,
      content: Buffer.from(dto.contentBase64, 'base64'),
      uploadedById: req.user.id,
    });
    return toAdminGuestListUploadResponse(result);
  }
  @Post('discover')
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  discover(@Request() req: { user: AuthenticatedUser }) {
    this.authorizeAdmin.execute({ userId: req.user.id, roles: req.user.roles });
    return this.discovery.execute();
  }
  @Get('imports')
  async list(@Param('concertId') concertId: string, @Request() req: { user: AuthenticatedUser }) {
    return (await this.batches.list({ userId: req.user.id, roles: req.user.roles }, concertId)).map(
      toPublicGuestListBatch,
    );
  }
  @Get('imports/:batchId')
  async get(
    @Param('concertId') concertId: string,
    @Param('batchId') batchId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return toPublicGuestListBatch(
      await this.batches.get({ userId: req.user.id, roles: req.user.roles }, concertId, batchId),
    );
  }
  @Get('imports/:batchId/report')
  async report(
    @Param('concertId') concertId: string,
    @Param('batchId') batchId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      return toGuestListReport(
        JSON.parse(
          (
            await this.batches.report(
              { userId: req.user.id, roles: req.user.roles },
              concertId,
              batchId,
            )
          ).toString('utf8'),
        ),
      );
    } catch (error) {
      if (error instanceof GuestListBatchNotCompletedError) {
        throw new UnprocessableEntityException(toGuestListBatchNotCompletedError(error));
      }
      throw error;
    }
  }
}
