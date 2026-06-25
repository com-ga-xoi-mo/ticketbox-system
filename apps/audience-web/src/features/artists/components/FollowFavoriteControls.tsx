import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { UserPlus, UserCheck, Heart, HeartOff } from 'lucide-react';
import { useAuth } from '../../../shared/auth/AuthContext';
import {
  useFollowArtist,
  useUnfollowArtist,
  useFavoriteArtist,
  useUnfavoriteArtist,
} from '../hooks/useArtistActions';
import { message } from 'antd';

interface FollowFavoriteControlsProps {
  artistId: string;
  slug: string;
  viewerFollowing: boolean | null;
  viewerFavorited: boolean | null;
  followerCount: number;
  favoriteCount: number;
}

export default function FollowFavoriteControls({
  artistId,
  slug,
  viewerFollowing,
  viewerFavorited,
  followerCount,
  favoriteCount,
}: FollowFavoriteControlsProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const followMutation = useFollowArtist(slug);
  const unfollowMutation = useUnfollowArtist(slug);
  const favoriteMutation = useFavoriteArtist(slug);
  const unfavoriteMutation = useUnfavoriteArtist(slug);

  const requireAuth = (callback: () => void) => {
    if (!session) {
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }
    callback();
  };

  const handleFollowClick = () => {
    requireAuth(() => {
      if (viewerFollowing) {
        unfollowMutation.mutate(artistId, {
          onError: () => message.error('Failed to unfollow artist'),
        });
      } else {
        followMutation.mutate(artistId, {
          onError: () => message.error('Failed to follow artist'),
        });
      }
    });
  };

  const handleFavoriteClick = () => {
    requireAuth(() => {
      if (viewerFavorited) {
        unfavoriteMutation.mutate(artistId, {
          onError: () => message.error('Failed to unfavorite artist'),
        });
      } else {
        favoriteMutation.mutate(artistId, {
          onError: () => message.error('Failed to favorite artist'),
        });
      }
    });
  };

  const isPending =
    followMutation.isPending ||
    unfollowMutation.isPending ||
    favoriteMutation.isPending ||
    unfavoriteMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant={viewerFollowing ? 'secondary' : 'default'}
        size="sm"
        onClick={handleFollowClick}
        disabled={isPending}
        className="min-w-[120px]"
      >
        {viewerFollowing ? (
          <>
            <UserCheck className="w-4 h-4 mr-2" />
            Following ({followerCount})
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4 mr-2" />
            Follow ({followerCount})
          </>
        )}
      </Button>

      <Button
        variant={viewerFavorited ? 'secondary' : 'outline'}
        size="sm"
        onClick={handleFavoriteClick}
        disabled={isPending}
        className="min-w-[120px]"
      >
        {viewerFavorited ? (
          <>
            <HeartOff className="w-4 h-4 mr-2" />
            Favorited ({favoriteCount})
          </>
        ) : (
          <>
            <Heart className="w-4 h-4 mr-2" />
            Favorite ({favoriteCount})
          </>
        )}
      </Button>
    </div>
  );
}
