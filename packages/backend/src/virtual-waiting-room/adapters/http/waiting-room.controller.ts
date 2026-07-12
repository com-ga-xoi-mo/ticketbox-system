import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { AdmitWaitingRoomUseCase } from '../../application/use-cases/admit-waiting-room.use-case';
import { GetWaitingRoomStatusUseCase } from '../../application/use-cases/get-waiting-room-status.use-case';
import { JoinWaitingRoomUseCase } from '../../application/use-cases/join-waiting-room.use-case';
import { LeaveWaitingRoomUseCase } from '../../application/use-cases/leave-waiting-room.use-case';
import { WaitingRoomStreamTokenService } from '../../infrastructure/realtime/waiting-room-stream-token.service';
import { serializeWaitingRoomStatus } from './waiting-room.presenter';

const STREAM_TICK_MS = 3_000;
const HEARTBEAT_MS = 25_000;

interface SseMessage {
  type?: string;
  data: unknown;
}

@Controller('waiting-room/:concertId')
export class WaitingRoomController {
  constructor(
    private readonly joinWaitingRoom: JoinWaitingRoomUseCase,
    private readonly leaveWaitingRoom: LeaveWaitingRoomUseCase,
    private readonly getWaitingRoomStatus: GetWaitingRoomStatusUseCase,
    private readonly admitWaitingRoom: AdmitWaitingRoomUseCase,
    private readonly streamTokenService: WaitingRoomStreamTokenService,
  ) {}

  @Post('join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async join(
    @Param('concertId') concertId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const status = await this.joinWaitingRoom.execute({
      concertId,
      userId: req.user.id,
    });
    await this.admitWaitingRoom.execute(concertId);
    const latest = await this.getWaitingRoomStatus.execute({
      concertId,
      userId: req.user.id,
    });
    return serializeWaitingRoomStatus(latest.status === 'LEFT' ? status : latest);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async leave(
    @Param('concertId') concertId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    await this.leaveWaitingRoom.execute({ concertId, userId: req.user.id });
    await this.admitWaitingRoom.execute(concertId);
    const status = await this.getWaitingRoomStatus.execute({
      concertId,
      userId: req.user.id,
    });
    return serializeWaitingRoomStatus(status);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async status(
    @Param('concertId') concertId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const status = await this.getWaitingRoomStatus.execute({
      concertId,
      userId: req.user.id,
    });
    return serializeWaitingRoomStatus(status);
  }

  @Get('stream-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  streamToken(
    @Param('concertId') concertId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return { token: this.streamTokenService.mint(req.user.id, concertId) };
  }

  @Sse('stream')
  stream(
    @Param('concertId') concertId: string,
    @Query('token') token: string | undefined,
  ): Observable<SseMessage> {
    const userId = token
      ? this.streamTokenService.verify(token, concertId)
      : null;
    if (!userId) {
      throw new UnauthorizedException('Invalid or missing stream token');
    }

    return new Observable<SseMessage>((subscriber) => {
      let closed = false;
      const pushStatus = async () => {
        try {
          const status = await this.getWaitingRoomStatus.execute({
            concertId,
            userId,
          });
          subscriber.next({
            type: 'status',
            data: serializeWaitingRoomStatus(status),
          });
        } catch (error) {
          subscriber.error(error);
        }
      };

      subscriber.next({ type: 'ready', data: { type: 'ready' } });
      void pushStatus();
      const tick = setInterval(() => {
        if (!closed) void pushStatus();
      }, STREAM_TICK_MS);
      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'ping', data: '' });
      }, HEARTBEAT_MS);

      return () => {
        closed = true;
        clearInterval(tick);
        clearInterval(heartbeat);
      };
    });
  }
}

