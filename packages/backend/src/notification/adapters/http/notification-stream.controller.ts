import {
  Controller,
  Get,
  Query,
  Request,
  Sse,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import { NotificationStreamTokenService } from '../../infrastructure/realtime/notification-stream-token.service';
import {
  NotificationStreamRegistry,
  type SseMessage,
} from '../../infrastructure/realtime/notification-stream.registry';

const HEARTBEAT_MS = 25_000;

@Controller()
export class NotificationStreamController {
  constructor(
    private readonly tokenService: NotificationStreamTokenService,
    private readonly registry: NotificationStreamRegistry,
  ) {}

  /** Bearer-authenticated: mint a short-lived token the browser uses to open the stream. */
  @Get('me/notifications/stream-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  mintStreamToken(@Request() req: { user: AuthenticatedUser }): { token: string } {
    return { token: this.tokenService.mint(req.user.id) };
  }

  /** SSE stream authenticated by the short-lived stream token (query param, not header). */
  @Sse('me/notifications/stream')
  stream(@Query('token') token: string | undefined): Observable<SseMessage> {
    const userId = token ? this.tokenService.verify(token) : null;
    if (!userId) {
      throw new UnauthorizedException('Invalid or missing stream token');
    }

    return new Observable<SseMessage>((subscriber) => {
      const stream = new Subject<SseMessage>();
      const sub = stream.subscribe(subscriber);
      this.registry.add(userId, stream);

      // Let the client confirm connection, then reconcile via REST.
      subscriber.next({ type: 'ready', data: JSON.stringify({ type: 'ready' }) });
      const heartbeat = setInterval(() => {
        subscriber.next({ type: 'ping', data: '' });
      }, HEARTBEAT_MS);

      return () => {
        clearInterval(heartbeat);
        this.registry.remove(userId, stream);
        sub.unsubscribe();
        stream.complete();
      };
    });
  }
}
