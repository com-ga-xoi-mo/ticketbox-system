import { Injectable, Inject } from '@nestjs/common';
import { IResaleSocialRepository, RESALE_SOCIAL_REPOSITORY } from '../../domain/ports/resale-social-repository.port';
import { Subject } from 'rxjs';

@Injectable()
export class ToggleUpvoteUseCase {
  constructor(@Inject(RESALE_SOCIAL_REPOSITORY) private readonly socialRepo: IResaleSocialRepository) {}
  async execute(userId: string, listingId: string, events$: Subject<any>) {
    const res = await this.socialRepo.toggleUpvote(userId, listingId);
    events$.next({
      listingId,
      type: 'upvote.updated',
      id: Date.now().toString(),
      data: res
    });
    return res;
  }
}

@Injectable()
export class AddCommentUseCase {
  constructor(@Inject(RESALE_SOCIAL_REPOSITORY) private readonly socialRepo: IResaleSocialRepository) {}
  async execute(userId: string, listingId: string, body: string, events$: Subject<any>) {
    const res = await this.socialRepo.addComment(userId, listingId, body);
    events$.next({
      listingId,
      type: 'comment.added',
      id: Date.now().toString(),
      data: { commentId: res.id, body: res.body, authorName: res.author.displayName, createdAt: res.createdAt }
    });
    return res;
  }
}

@Injectable()
export class AddReplyUseCase {
  constructor(@Inject(RESALE_SOCIAL_REPOSITORY) private readonly socialRepo: IResaleSocialRepository) {}
  async execute(userId: string, listingId: string, commentId: string, body: string, events$: Subject<any>) {
    const res = await this.socialRepo.addReply(userId, listingId, commentId, body);
    events$.next({
      listingId,
      type: 'comment.added',
      id: Date.now().toString(),
      data: { commentId: res.id, parentCommentId: commentId, body: res.body, authorName: res.author.displayName, createdAt: res.createdAt }
    });
    return res;
  }
}

@Injectable()
export class FlagCommentUseCase {
  constructor(@Inject(RESALE_SOCIAL_REPOSITORY) private readonly socialRepo: IResaleSocialRepository) {}
  async execute(userId: string, commentId: string) {
    return this.socialRepo.flagComment(userId, commentId);
  }
}

@Injectable()
export class GetCommentsUseCase {
  constructor(@Inject(RESALE_SOCIAL_REPOSITORY) private readonly socialRepo: IResaleSocialRepository) {}
  async execute(listingId: string, page: number, limit: number) {
    return this.socialRepo.getComments(listingId, page, limit);
  }
}
