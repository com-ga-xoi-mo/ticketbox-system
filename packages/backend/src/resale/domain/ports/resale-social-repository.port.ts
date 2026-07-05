import { ResaleSocialComment } from '../resale-social.entity';

export const RESALE_SOCIAL_REPOSITORY = Symbol('RESALE_SOCIAL_REPOSITORY');

export interface IResaleSocialRepository {
  toggleUpvote(userId: string, listingId: string): Promise<{ upvoteCount: number; upvotedByMe: boolean }>;
  addComment(userId: string, listingId: string, body: string): Promise<ResaleSocialComment>;
  addReply(userId: string, listingId: string, commentId: string, body: string): Promise<ResaleSocialComment>;
  getComments(listingId: string, page: number, limit: number): Promise<ResaleSocialComment[]>;
  flagComment(userId: string, commentId: string): Promise<void>;
}
