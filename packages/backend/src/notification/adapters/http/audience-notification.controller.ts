import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../../identity/domain/authenticated-user.interface';
import { Role } from '../../../identity/domain/role.enum';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { JwtAuthGuard } from '../../../identity/infrastructure/passport/jwt-auth.guard';
import {
  GetAudienceUnreadNotificationCountUseCase,
  ListAudienceNotificationsUseCase,
  MarkAllAudienceNotificationsReadUseCase,
  MarkAudienceNotificationReadUseCase,
} from '../../application/use-cases/audience-notification-inbox.use-cases';
import { serializeAudienceNotification } from './audience-notification.presenter';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUDIENCE)
export class AudienceNotificationController {
  constructor(
    private readonly listNotifications: ListAudienceNotificationsUseCase,
    private readonly unreadCount: GetAudienceUnreadNotificationCountUseCase,
    private readonly markRead: MarkAudienceNotificationReadUseCase,
    private readonly markAllRead: MarkAllAudienceNotificationsReadUseCase,
  ) {}

  @Get('me/notifications')
  async listMyNotifications(
    @Query('unreadOnly') unreadOnly: string | undefined,
    @Query('type') type: string | undefined,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const notifications = await this.listNotifications.execute({
      userId: req.user.id,
      unreadOnly: unreadOnly === 'true',
      type,
    });
    return notifications.map((notification) =>
      serializeAudienceNotification(notification),
    );
  }

  @Get('me/notifications/unread-count')
  getMyUnreadCount(@Request() req: { user: AuthenticatedUser }) {
    return this.unreadCount.execute(req.user.id);
  }

  @Post('me/notifications/:id/read')
  async markMyNotificationRead(
    @Param('id') notificationId: string,
    @Request() req: { user: AuthenticatedUser },
  ) {
    const notification = await this.markRead.execute({
      userId: req.user.id,
      notificationId,
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return {
      id: notification.id,
      readAt: notification.readAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  @Post('me/notifications/read-all')
  async markAllMyNotificationsRead(@Request() req: { user: AuthenticatedUser }) {
    const result = await this.markAllRead.execute(req.user.id);
    return {
      updatedCount: result.updatedCount,
      readAt: result.readAt.toISOString(),
    };
  }
}
