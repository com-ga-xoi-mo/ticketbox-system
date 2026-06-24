import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, Request, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { OnlineCheckinUseCase } from '../../application/use-cases/online-checkin.use-case';
import { BatchSyncRequestSchema, type BatchSyncRequest, type BatchSyncResponse, type OnlineScanResponse, type TicketCacheDeltaResponse, type TicketCacheFullResponse } from '@ticketbox/api-types';
import { BatchSyncUseCase } from '../../application/use-cases/batch-sync.use-case';
import { GetTicketCacheUseCase } from '../../application/use-cases/get-ticket-cache.use-case';
import { OnlineCheckinDto } from './dto/online-checkin.dto';
import { toBatchSyncResponse, toOnlineScanResponse } from './checkin-contract.mapper';
import { ZodBodyPipe } from './zod-body.pipe';

@Controller('checkin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHECKIN_STAFF)
export class CheckinController {
  constructor(
    private readonly onlineCheckin: OnlineCheckinUseCase,
    private readonly batchSync: BatchSyncUseCase,
    private readonly getTicketCache: GetTicketCacheUseCase,
  ) {}

  @Post('scan')
  async scan(
    @Body() dto: OnlineCheckinDto,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<OnlineScanResponse> {
    const result = await this.onlineCheckin.execute({
      actor: { userId: req.user.id, roles: req.user.roles },
      assignmentId: dto.assignmentId,
      concertId: dto.concertId,
      gateName: dto.gate,
      qrPayload: dto.qrPayload,
      scannedAt: new Date(dto.scannedAt),
      deviceId: dto.deviceId,
    });

    return toOnlineScanResponse(result);
  }

  @Post('sync')
  async sync(
    @Body(new ZodBodyPipe(BatchSyncRequestSchema)) body: BatchSyncRequest,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<BatchSyncResponse> {
    const result = await this.batchSync.execute({
      actor: { userId: req.user.id, roles: req.user.roles },
      concertId: body.concertId,
      since: body.since ? new Date(body.since) : undefined,
      events: body.events.map((event) => ({
        localId: event.localId,
        assignmentId: event.assignmentId,
        concertId: event.concertId,
        ...(event.gate ? { gateName: event.gate } : {}),
        qrPayloadHash: event.qrPayloadHash,
        scannedAt: new Date(event.scannedAt),
        deviceId: event.deviceId,
      })),
    });
    return toBatchSyncResponse(result);
  }

  @Get('ticket-cache')
  async ticketCache(
    @Query('assignmentId') assignmentId: string,
    @Query('concertId') concertId: string,
    @Query('since') since: string | undefined,
    @Request() req: { user: AuthenticatedUser },
  ): Promise<TicketCacheFullResponse | TicketCacheDeltaResponse> {
    const result = await this.getTicketCache.execute({
      actor: { userId: req.user.id, roles: req.user.roles },
      assignmentId,
      concertId,
      since: since ? new Date(since) : undefined,
    });

    if (result.kind === 'forbidden') throw new ForbiddenException(result.reason);
    if (result.kind === 'bad-request') throw new BadRequestException(result.reason);

    if (result.kind === 'full') {
      return { entries: result.entries, syncedAt: result.syncedAt.toISOString() };
    }
    return {
      upserted: result.upserted,
      voided: result.voided,
      syncedAt: result.syncedAt.toISOString(),
    };
  }
}
