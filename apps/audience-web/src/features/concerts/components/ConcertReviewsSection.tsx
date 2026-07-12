import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Pencil, Star, Trash2 } from 'lucide-react';
import type { PublicConcertDetailResponse, PublicConcertReview } from '@ticketbox/api-types';

import {
  useConcertReviews,
  useCreateConcertReview,
  useDeleteMyConcertReview,
  useUpdateMyConcertReview,
} from '../../../shared/api/concert-reviews';
import { useMyTickets } from '../../../shared/api/tickets';
import { useAuth } from '../../../shared/auth/AuthContext';
import { useRequireAuth } from '../../../shared/hooks/useRequireAuth';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';

interface Props {
  concert: PublicConcertDetailResponse;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Không thể lưu đánh giá lúc này.';
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex gap-1" aria-label="Chọn số sao">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="rounded-full p-1 transition hover:bg-amber-100"
          aria-label={`${star} sao`}
          onClick={() => onChange(star)}
        >
          <Star
            className={`size-6 ${
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewItem({ review }: { review: PublicConcertReview }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{review.author.displayName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1 text-amber-500" aria-label={`${review.rating} sao`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`size-4 ${index < review.rating ? 'fill-current' : 'text-muted-foreground/30'}`}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {review.comment}
      </p>
    </div>
  );
}

export function ConcertReviewsSection({ concert }: Props) {
  const { session } = useAuth();
  const { redirectToLogin } = useRequireAuth();
  const reviewsQuery = useConcertReviews(concert.slug);
  const ticketsQuery = useMyTickets(Boolean(session));
  const createReview = useCreateConcertReview(concert.slug);
  const updateReview = useUpdateMyConcertReview(concert.slug);
  const deleteReview = useDeleteMyConcertReview(concert.slug);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reviews = reviewsQuery.data?.reviews ?? [];
  const summary = reviewsQuery.data?.summary ?? { averageRating: null, reviewCount: 0 };
  const myReview = useMemo(
    () => reviews.find((review) => review.author.id === session?.sub),
    [reviews, session?.sub],
  );
  const otherReviews = useMemo(
    () => (myReview ? reviews.filter((review) => review.id !== myReview.id) : reviews),
    [myReview, reviews],
  );
  const hasIssuedTicket = Boolean(
    session &&
      ticketsQuery.data?.some(
        (ticket) => ticket.concertId === concert.id && ticket.status === 'ISSUED',
      ),
  );

  useEffect(() => {
    if (myReview && !isEditing) {
      setRating(myReview.rating);
      setComment(myReview.comment);
    }
  }, [myReview, isEditing]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 1) {
      setFormError('Vui lòng nhập bình luận.');
      return;
    }
    try {
      if (myReview) {
        await updateReview.mutateAsync({ rating, comment: trimmedComment });
        setIsEditing(false);
      } else {
        await createReview.mutateAsync({ rating, comment: trimmedComment });
      }
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    setFormError(null);
    try {
      await deleteReview.mutateAsync();
      setComment('');
      setRating(5);
      setIsEditing(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const isSubmitting = createReview.isPending || updateReview.isPending || deleteReview.isPending;

  return (
    <Card className="border-white/70 bg-card/90 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl font-black">
          <MessageSquare className="size-5 text-primary" />
          Đánh giá sự kiện
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold text-foreground">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            {summary.averageRating === null ? 'Chưa có đánh giá' : summary.averageRating.toFixed(1)}
          </span>
          <span>{summary.reviewCount} bình luận</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!session && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Đăng nhập và mua vé để đánh giá sự kiện này.
            <Button
              variant="outline"
              size="sm"
              className="ml-3 rounded-full"
              onClick={() => redirectToLogin()}
            >
              Đăng nhập
            </Button>
          </div>
        )}

        {session && !hasIssuedTicket && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Bạn cần có vé đã phát hành của sự kiện này để gửi đánh giá.
          </div>
        )}

        {session && hasIssuedTicket && (!myReview || isEditing) && (
          <form className="space-y-3 rounded-2xl border border-border/70 bg-white/70 p-4" onSubmit={handleSubmit}>
            <StarPicker value={rating} onChange={setRating} />
            <Textarea
              value={comment}
              maxLength={1000}
              placeholder="Chia sẻ trải nghiệm của bạn về sự kiện..."
              onChange={(event) => setComment(event.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{comment.trim().length}/1000 ký tự</p>
              <div className="flex gap-2">
                {isEditing && (
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setIsEditing(false)}>
                    Hủy
                  </Button>
                )}
                <Button type="submit" className="rounded-full" disabled={isSubmitting}>
                  {myReview ? 'Lưu đánh giá' : 'Gửi đánh giá'}
                </Button>
              </div>
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </form>
        )}

        {session && myReview && !isEditing && (
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-foreground">Đánh giá của bạn</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setIsEditing(true)}>
                  <Pencil className="size-3.5" />
                  Sửa
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" disabled={isSubmitting} onClick={handleDelete}>
                  <Trash2 className="size-3.5" />
                  Xóa
                </Button>
              </div>
            </div>
            <ReviewItem review={myReview} />
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
        )}

        {reviewsQuery.isLoading && <p className="text-sm text-muted-foreground">Đang tải đánh giá...</p>}
        {!reviewsQuery.isLoading && reviews.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Chưa có đánh giá nào cho sự kiện này.
          </p>
        )}
        {otherReviews.length > 0 && (
          <div className="space-y-3">
            {otherReviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
