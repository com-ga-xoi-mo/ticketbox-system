import { useState } from 'react';

import type { Concert } from '../../concerts-shared/types';
import { Button } from '../../../shared/ui/button';
import { useConcertReviews, useHideConcertReviewMutation } from './hooks';

interface AdminConcertReviewsPanelProps {
  concert: Concert;
}

export function AdminConcertReviewsPanel({ concert }: AdminConcertReviewsPanelProps) {
  const { data, isLoading, isError, error } = useConcertReviews(concert.slug);
  const hideMutation = useHideConcertReviewMutation(concert.id, concert.slug);
  const [hidingReviewId, setHidingReviewId] = useState<string | null>(null);

  const reviews = data?.reviews ?? [];

  const hideReview = async (reviewId: string) => {
    const reason = window.prompt('Nhập lý do ẩn review (không bắt buộc):')?.trim();
    setHidingReviewId(reviewId);
    try {
      await hideMutation.mutateAsync({ reviewId, reason: reason || undefined });
    } finally {
      setHidingReviewId(null);
    }
  };

  return (
    <section className="flex flex-col gap-3 border-t border-white/5 px-6 py-5">
      <div>
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
          Kiểm duyệt đánh giá
        </h5>
        <p className="mt-1 text-xs text-on-surface-variant">
          Chỉ hiển thị review đang công khai. Review bị ẩn sẽ biến mất khỏi trang chi tiết sự kiện.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-on-surface-variant">Đang tải đánh giá...</p>
      ) : isError ? (
        <p className="text-xs font-semibold text-error">
          {error instanceof Error ? error.message : 'Không thể tải đánh giá.'}
        </p>
      ) : reviews.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-surface-container-high/30 p-3 text-xs text-on-surface-variant">
          Chưa có review công khai.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-white/10 bg-surface-container-high/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-on-surface">{review.author.displayName}</span>
                    <span className="text-amber-300">{'★'.repeat(review.rating)}</span>
                  </div>
                  <p className="mt-2 break-words text-sm text-on-surface">{review.comment}</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void hideReview(review.id)}
                  disabled={hideMutation.isPending && hidingReviewId === review.id}
                  className="h-8 shrink-0 px-3 text-xs"
                >
                  {hideMutation.isPending && hidingReviewId === review.id ? 'Đang ẩn...' : 'Ẩn'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
