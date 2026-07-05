import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { SendMessageUseCase, GetMyThreadsUseCase, GetThreadMessagesUseCase } from '../../application/use-cases/messaging.use-cases';
import { JwtAuthGuard } from '../../../identity/auth.module';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResaleMessagingController {
  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly getMyThreadsUseCase: GetMyThreadsUseCase,
    private readonly getThreadMessagesUseCase: GetThreadMessagesUseCase
  ) {}

  @Post('resale/listings/:id/messages')
  @Roles(Role.AUDIENCE)
  async initiateThread(@Req() req: any, @Param('id') listingId: string, @Body('body') body: string) {
    return this.sendMessageUseCase.execute(req.user.id, listingId, body);
  }

  @Post('resale/listings/:id/messages/:threadId')
  @Roles(Role.AUDIENCE)
  async replyThread(@Req() req: any, @Param('id') listingId: string, @Param('threadId') threadId: string, @Body('body') body: string) {
    return this.sendMessageUseCase.execute(req.user.id, listingId, body, threadId);
  }

  @Get('me/messages/threads')
  @Roles(Role.AUDIENCE)
  async getMyThreads(@Req() req: any) {
    return this.getMyThreadsUseCase.execute(req.user.id);
  }

  @Get('me/messages/threads/:threadId')
  @Roles(Role.AUDIENCE)
  async getThreadMessagesDirect(@Req() req: any, @Param('threadId') threadId: string) {
    return this.getThreadMessagesUseCase.execute(req.user.id, threadId);
  }

  @Get('resale/listings/:id/messages/:threadId')
  @Roles(Role.AUDIENCE)
  async getThreadMessages(@Req() req: any, @Param('threadId') threadId: string) {
    return this.getThreadMessagesUseCase.execute(req.user.id, threadId);
  }
}
