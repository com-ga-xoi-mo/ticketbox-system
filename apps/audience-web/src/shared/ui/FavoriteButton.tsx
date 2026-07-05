import { Heart } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { checkFavoriteStatus, toggleFavorite } from '../api/favorites';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../../components/ui/button';
import { cn } from './cn';

interface FavoriteButtonProps {
  concertId: string;
  className?: string;
  iconOnly?: boolean;
}

export function FavoriteButton({ concertId, className, iconOnly = false }: FavoriteButtonProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const queryKey = ['favorite', concertId];

  const { data: status } = useQuery({
    queryKey,
    queryFn: () => checkFavoriteStatus(concertId),
    enabled: !!session,
  });

  const isFavorited = status?.isFavorited ?? false;

  const toggleMutation = useMutation({
    mutationFn: () => toggleFavorite(concertId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<{ isFavorited: boolean }>(queryKey);
      queryClient.setQueryData(queryKey, { isFavorited: !isFavorited });
      return { previousState };
    },
    onError: (err, _variables, context) => {
      if (context?.previousState) {
        queryClient.setQueryData(queryKey, context.previousState);
      }
      toast.error('Có lỗi xảy ra khi lưu sự kiện yêu thích');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      toast.error('Vui lòng đăng nhập để lưu sự kiện');
      navigate('/login');
      return;
    }

    toggleMutation.mutate();
  };

  return (
    <Button
      variant="outline"
      size={iconOnly ? 'icon' : 'default'}
      className={cn(
        'group z-10 border-white/40 bg-white/40 backdrop-blur hover:bg-white/60',
        isFavorited && 'border-rose-500 bg-rose-50 hover:bg-rose-100',
        className,
      )}
      onClick={handleClick}
      aria-label={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích'}
    >
      <Heart
        className={cn(
          'size-5 transition-colors',
          isFavorited ? 'fill-rose-500 text-rose-500' : 'text-foreground group-hover:text-rose-500',
        )}
      />
      {!iconOnly && <span className="ml-2">{isFavorited ? 'Đã lưu' : 'Lưu lại'}</span>}
    </Button>
  );
}
