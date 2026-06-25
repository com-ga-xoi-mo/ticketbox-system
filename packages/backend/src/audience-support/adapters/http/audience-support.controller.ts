import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  CreateRefundRequestSchema,
  CreateSupportRequestSchema,
} from '@ticketbox/api-types';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import {
  AudienceResourceNotFoundError,
  DuplicateRefundRequestError,
  RefundRequestIneligibleError,
  TicketResendUnavailableError,
} from '../../domain/errors';
import {
  RefundRequestReason,
  SupportRequestCategory,
} from '../../domain/support.types';
import {
  CreateRefundRequestUseCase,
  CreateSupportRequestUseCase,
  GetOrderConfirmationUseCase,
  GetRefundEligibilityUseCase,
  GetRefundRequestUseCase,
  GetSupportRequestUseCase,
  GetTicketDownloadUseCase,
  ListRefundRequestsUseCase,
  ListSupportRequestsUseCase,
  ResendTicketsUseCase,
} from '../../application/audience-support.use-cases';
import {
  serializeOrderConfirmation,
  serializeRefundEligibility,
  serializeRefundRequest,
  serializeSupportRequest,
  serializeTicketDownload,
} from './audience-support.presenter';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUDIENCE)
export class AudienceSupportController {
  constructor(
    private readonly createSupportRequest: CreateSupportRequestUseCase,
    private readonly listSupportRequests: ListSupportRequestsUseCase,
    private readonly getSupportRequest: GetSupportRequestUseCase,
    private readonly getRefundEligibility: GetRefundEligibilityUseCase,
    private readonly createRefundRequest: CreateRefundRequestUseCase,
    private readonly listRefundRequests: ListRefundRequestsUseCase,
    private readonly getRefundRequest: GetRefundRequestUseCase,
    private readonly resendTickets: ResendTicketsUseCase,
    private readonly getTicketDownload: GetTicketDownloadUseCase,
    private readonly getOrderConfirmation: GetOrderConfirmationUseCase,
  ) {}

  @Get('me/support-requests')
  async listMySupportRequests(@Request() req: { user: AuthenticatedUser }) {
    const requests = await this.listSupportRequests.execute(req.user.id);
    return requests.map((request) => serializeSupportRequest(request));
  }

  @Post('me/support-requests')
  async createMySupportRequest(
    @Body() body: unknown,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const dto = CreateSupportRequestSchema.parse(body);
    try {
      const request = await this.createSupportRequest.execute({
        userId: req.user.id,
        orderId: dto.orderId,
        ticketId: dto.ticketId,
        category: dto.category as SupportRequestCategory,
        subject: dto.subject,
        message: dto.message,
      });
      return serializeSupportRequest(request);
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  @Get('me/support-requests/:id')
  async getMySupportRequest(
    @Param('id') requestId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const request = await this.getSupportRequest.execute(req.user.id, requestId);
      return serializeSupportRequest(request);
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  @Get('me/refund-eligibility')
  async getMyRefundEligibility(
    @Query('orderId') orderId: string | undefined,
    @Query('ticketId') ticketId: string | undefined,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const eligibility = await this.getRefundEligibility.execute({
      userId: req.user.id,
      orderId,
      ticketId,
    });
    return serializeRefundEligibility(eligibility);
  }

  @Get('me/refund-requests')
  async listMyRefundRequests(@Request() req: { user: AuthenticatedUser }) {
    const requests = await this.listRefundRequests.execute(req.user.id);
    return requests.map((request) => serializeRefundRequest(request));
  }

  @Post('me/refund-requests')
  async createMyRefundRequest(
    @Body() body: unknown,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const dto = CreateRefundRequestSchema.parse(body);
    try {
      const request = await this.createRefundRequest.execute({
        userId: req.user.id,
        orderId: dto.orderId,
        ticketId: dto.ticketId,
        reason: dto.reason as RefundRequestReason,
        message: dto.message,
      });
      return serializeRefundRequest(request);
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  @Get('me/refund-requests/:id')
  async getMyRefundRequest(
    @Param('id') requestId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const request = await this.getRefundRequest.execute(req.user.id, requestId);
      return serializeRefundRequest(request);
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  @Post('me/orders/:id/resend-tickets')
  async resendMyOrderTickets(
    @Param('id') orderId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const result = await this.resendTickets.resendOrder(req.user.id, orderId);
      return {
        status: 'QUEUED',
        notificationId: result.notificationId,
        cooldownUntil: null,
        message: 'Ticket email queued.',
      };
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  @Post('me/tickets/:id/resend')
  async resendMyTicket(
    @Param('id') ticketId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      const result = await this.resendTickets.resendTicket(req.user.id, ticketId);
      return {
        status: 'QUEUED',
        notificationId: result.notificationId,
        cooldownUntil: null,
        message: 'Ticket email queued.',
      };
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  @Get('me/tickets/:id/download')
  async downloadMyTicket(
    @Param('id') ticketId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      return serializeTicketDownload(
        await this.getTicketDownload.execute(req.user.id, ticketId),
      );
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  @Get('me/orders/:id/confirmation')
  async downloadMyOrderConfirmation(
    @Param('id') orderId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    try {
      return serializeOrderConfirmation(
        await this.getOrderConfirmation.execute(req.user.id, orderId),
      );
    } catch (error: unknown) {
      return this.mapSupportError(error);
    }
  }

  private mapSupportError(error: unknown): never {
    if (error instanceof AudienceResourceNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof DuplicateRefundRequestError) {
      throw new ConflictException({
        message: error.message,
        existingRequestId: error.existingRequestId,
      });
    }
    if (
      error instanceof RefundRequestIneligibleError ||
      error instanceof TicketResendUnavailableError
    ) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
