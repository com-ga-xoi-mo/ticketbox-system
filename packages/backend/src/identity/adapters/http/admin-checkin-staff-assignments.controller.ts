import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';
import {
  CheckinAssignmentNotFoundError,
  CheckinStaffUserNotFoundError,
  ConcertNotFoundError,
  DuplicateCheckinAssignmentError,
  EmailAlreadyRegisteredError,
  ForbiddenAdminActionError,
  ForbiddenConcertOwnershipError,
  InvalidBulkCheckinStaffRequestError,
  UserIsNotCheckinStaffError,
} from '../../domain/errors';
import { Role } from '../../domain/role.enum';
import { RateLimited } from '../../../platform/rate-limiting/rate-limit.decorator';
import { RateLimitPolicy } from '../../../platform/rate-limiting/rate-limit-policy';
import { BulkCreateCheckinStaffUseCase } from '../../application/use-cases/bulk-create-checkin-staff.use-case';
import { ManageCheckinStaffAssignmentsUseCase } from '../../application/use-cases/manage-checkin-staff-assignments.use-case';
import { JwtAuthGuard } from '../../infrastructure/passport/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { AssignCheckinStaffDto } from './dto/assign-checkin-staff.dto';
import { BulkCreateCheckinStaffDto } from './dto/bulk-create-checkin-staff.dto';
import { RolesGuard } from './guards/roles.guard';

@Controller('admin/concerts/:concertId/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
export class AdminCheckinStaffAssignmentsController {
  constructor(
    private readonly manageAssignments: ManageCheckinStaffAssignmentsUseCase,
    private readonly bulkCreateStaff: BulkCreateCheckinStaffUseCase,
  ) {}

  @Get()
  async list(@Param('concertId') concertId: string, @Request() req: { user: AuthenticatedUser }) {
    return this.handleAuthorizationErrors(() =>
      this.manageAssignments.listActive({
        actor: { userId: req.user.id, roles: req.user.roles },
        concertId,
      }),
    );
  }

  @Post()
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async assign(
    @Param('concertId') concertId: string,
    @Body() dto: AssignCheckinStaffDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleAuthorizationErrors(() =>
      this.manageAssignments.assign({
        actor: { userId: req.user.id, roles: req.user.roles },
        concertId,
        staffUserId: dto.staffUserId,
        gateName: dto.gateName,
      }),
    );
  }

  @Post('bulk-create')
  @Roles(Role.ADMIN)
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async bulkCreate(
    @Param('concertId') concertId: string,
    @Body() dto: BulkCreateCheckinStaffDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleAuthorizationErrors(() =>
      this.bulkCreateStaff.execute({
        actor: { userId: req.user.id, roles: req.user.roles },
        concertId,
        baseEmail: dto.baseEmail,
        quantity: dto.quantity,
        displayNamePrefix: dto.displayNamePrefix,
      }),
    );
  }

  @Delete(':assignmentId')
  @RateLimited(RateLimitPolicy.ADMIN_WRITE)
  async revoke(
    @Param('concertId') concertId: string,
    @Param('assignmentId') assignmentId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.handleAuthorizationErrors(() =>
      this.manageAssignments.revoke({
        actor: { userId: req.user.id, roles: req.user.roles },
        concertId,
        assignmentId,
      }),
    );
  }

  private async handleAuthorizationErrors<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (err: unknown) {
      if (
        err instanceof ForbiddenAdminActionError ||
        err instanceof ForbiddenConcertOwnershipError ||
        err instanceof UserIsNotCheckinStaffError
      ) {
        throw new ForbiddenException(err.message);
      }

      if (
        err instanceof ConcertNotFoundError ||
        err instanceof CheckinStaffUserNotFoundError ||
        err instanceof CheckinAssignmentNotFoundError
      ) {
        throw new NotFoundException(err.message);
      }

      if (err instanceof DuplicateCheckinAssignmentError || err instanceof EmailAlreadyRegisteredError) {
        throw new ConflictException(err.message);
      }

      if (err instanceof InvalidBulkCheckinStaffRequestError) {
        throw new BadRequestException(err.message);
      }

      throw err;
    }
  }
}
