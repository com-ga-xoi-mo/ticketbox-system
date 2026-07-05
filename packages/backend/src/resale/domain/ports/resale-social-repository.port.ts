export const RESALE_SOCIAL_REPOSITORY = Symbol('RESALE_SOCIAL_REPOSITORY');

export interface IResaleSocialRepository {
  toggleUpvote(userId: string, listingId: string): Promise<{ upvoteCount: number; upvotedByMe: boolean }>;
  addComment(userId: string, listingId: string, body: string): Promise<any>;
  addReply(userId: string, listingId: string, commentId: string, body: string): Promise<any>;
  getComments(listingId: string, page: number, limit: number): Promise<any[]>;
  flagComment(userId: string, commentId: string): Promise<void>;
}
