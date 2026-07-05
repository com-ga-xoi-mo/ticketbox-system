import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  useListingComments,
  useAddComment,
  useAddReply,
  useFlagComment,
  useListingSSE,
} from '../../../shared/api/resale';
import { useAuth } from '../../../shared/auth/AuthContext';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Separator } from '../../../components/ui/separator';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';
import { MessageSquare, Reply, Flag, Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface CommentThreadProps {
  listingId: string;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

interface ReplyFormProps {
  listingId: string;
  commentId: string;
  onDone: () => void;
}

function ReplyForm({ listingId, commentId, onDone }: ReplyFormProps) {
  const [body, setBody] = useState('');
  const addReply = useAddReply(listingId, commentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addReply.mutate(body, { onSuccess: () => { setBody(''); onDone(); } });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3 pl-10">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Viết phản hồi..."
        rows={2}
        maxLength={1000}
        className="resize-none text-sm flex-1"
        autoFocus
      />
      <div className="flex flex-col gap-1 shrink-0">
        <Button type="submit" size="sm" disabled={!body.trim() || addReply.isPending}>
          <Send className="w-3 h-3" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Huỷ</Button>
      </div>
    </form>
  );
}

interface CommentItemProps {
  comment: any;
  listingId: string;
}

function CommentItem({ comment, listingId }: CommentItemProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const flagComment = useFlagComment(listingId, comment.id);

  const handleReply = () => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setShowReplyForm(true);
  };

  const handleFlag = () => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (confirm('Bạn có chắc muốn báo cáo bình luận này không?')) {
      flagComment.mutate();
    }
  };

  const authorName = comment.author?.displayName ?? comment.authorName ?? 'Người dùng';

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-secondary text-xs">
            {authorName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{authorName}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
            {comment.flagCount >= 2 && (
              <Badge variant="destructive" className="text-[10px]">Đang bị báo cáo</Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed">{comment.body}</p>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleReply}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Reply className="w-3 h-3" /> Trả lời
            </button>
            <button
              onClick={handleFlag}
              disabled={flagComment.isPending}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            >
              <Flag className="w-3 h-3" /> Báo cáo
            </button>
          </div>
        </div>
      </div>

      {showReplyForm && (
        <ReplyForm
          listingId={listingId}
          commentId={comment.id}
          onDone={() => setShowReplyForm(false)}
        />
      )}

      {/* Nested replies */}
      {comment.replies?.length > 0 && (
        <div className="pl-10 space-y-3 border-l-2 border-muted ml-4">
          {comment.replies.map((reply: any) => {
            const replyAuthor = reply.author?.displayName ?? reply.authorName ?? 'Người dùng';
            return (
              <div key={reply.id} className="flex gap-3">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-secondary text-[10px]">
                    {replyAuthor.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs">{replyAuthor}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{reply.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ listingId }: CommentThreadProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useListingComments(listingId);
  const addComment = useAddComment(listingId);
  const [body, setBody] = useState('');

  // SSE: prepend new comments in real time
  useListingSSE(listingId, {
    onCommentAdded: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['listing-comments', listingId] });
    }, [listingId, queryClient]),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (!body.trim()) return;
    addComment.mutate(body, { onSuccess: () => setBody('') });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold tracking-tight">Bình luận cộng đồng</h2>
        {comments && (
          <span className="text-muted-foreground text-sm font-normal">({comments.length})</span>
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex gap-3 items-start">
        <Avatar className="h-8 w-8 shrink-0 mt-1">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {session ? (session as any).displayName?.substring(0, 2)?.toUpperCase() ?? 'ME' : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={session ? 'Viết bình luận...' : 'Đăng nhập để bình luận...'}
            rows={3}
            maxLength={1000}
            className="resize-none text-sm"
            onClick={() => {
              if (!session) navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
            }}
            readOnly={!session}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{body.length}/1000</span>
            <Button type="submit" size="sm" disabled={!body.trim() || addComment.isPending} className="gap-2">
              <Send className="w-3 h-3" />
              {addComment.isPending ? 'Đang gửi...' : 'Gửi'}
            </Button>
          </div>
        </div>
      </form>

      <Separator />

      {/* Comment list */}
      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : !comments?.length ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-dashed rounded-lg">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium">Chưa có bình luận nào.</p>
          <p className="text-sm mt-1">Hãy là người đầu tiên bình luận!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment: any) => (
            <CommentItem key={comment.id} comment={comment} listingId={listingId} />
          ))}
        </div>
      )}
    </div>
  );
}
