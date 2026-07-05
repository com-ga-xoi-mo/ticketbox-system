export interface ResaleSocialComment {
  id: string;
  listingId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  replies?: ResaleSocialComment[];
  author?: { displayName: string; avatarAssetId?: string | null };
}
