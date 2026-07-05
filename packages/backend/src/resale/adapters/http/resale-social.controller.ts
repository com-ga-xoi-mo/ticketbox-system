import { Controller, Post, Get, Param, Body, UseGuards, Req, Sse, MessageEvent, Query } from '@nestjs/common';
import { ToggleUpvoteUseCase, AddCommentUseCase, AddReplyUseCase, GetCommentsUseCase, FlagCommentUseCase } from '../../application/use-cases/social.use-cases';
import { JwtAuthGuard } from '../../../identity/auth.module';
import { RolesGuard } from '../../../identity/adapters/http/guards/roles.guard';
import { Roles } from '../../../identity/adapters/http/decorators/roles.decorator';
import { Role } from '../../../identity/domain/role.enum';
import { Observable, filter, map, Subject } from 'rxjs';
import { Inject } from '@nestjs/common';

@Controller('resale/listings')
export class ResaleSocialController {
  constructor(
    private readonly toggleUpvoteUseCase: ToggleUpvoteUseCase,
    private readonly addCommentUseCase: AddCommentUseCase,
    private readonly addReplyUseCase: AddReplyUseCase,
    private readonly getCommentsUseCase: GetCommentsUseCase,
    private readonly flagCommentUseCase: FlagCommentUseCase,
    @Inject('SSE_SUBJECT') private readonly listingEvents$: Subject<any>
  ) {}

  @Sse(':id/events')
  events(@Param('id') listingId: string): Observable<MessageEvent> {
    return this.listingEvents$.pipe(
      filter(event => event.listingId === listingId),
      map(event => ({
        data: event.data,
        type: event.type,
        id: event.id
      }) as MessageEvent)
    );
  }

  @Post(':id/upvote')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async toggleUpvote(@Req() req: any, @Param('id') listingId: string) {
    return this.toggleUpvoteUseCase.execute(req.user.userId, listingId, this.listingEvents$);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async addComment(@Req() req: any, @Param('id') listingId: string, @Body('body') body: string) {
    return this.addCommentUseCase.execute(req.user.userId, listingId, body, this.listingEvents$);
  }

  @Post(':id/comments/:commentId/replies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async addReply(@Req() req: any, @Param('id') listingId: string, @Param('commentId') commentId: string, @Body('body') body: string) {
    return this.addReplyUseCase.execute(req.user.userId, listingId, commentId, body, this.listingEvents$);
  }

  @Get(':id/comments')
  async getComments(@Param('id') listingId: string, @Query('page') page?: string) {
    return this.getCommentsUseCase.execute(listingId, page ? parseInt(page, 10) : 1, 20);
  }

  @Post(':id/comments/:commentId/flag')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AUDIENCE)
  async flagComment(@Req() req: any, @Param('commentId') commentId: string) {
    return this.flagCommentUseCase.execute(req.user.userId, commentId);
  }
}
