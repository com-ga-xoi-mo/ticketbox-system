import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardTitle } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Gift, AlertCircle, CheckCircle2, Ticket } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import { apiGet, apiPost } from '../../shared/api/client';

export function GiftTransferPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const [actionSuccess, setActionSuccess] = useState<'ACCEPTED' | 'DECLINED' | null>(null);
  const [acceptedTicketId, setAcceptedTicketId] = useState<string>('');
  const [actionError, setActionError] = useState('');

  // Fetch transfer details
  const {
    data: transfer,
    isLoading,
    isError,
    error,
  } = useQuery<{ senderName: string; concertName: string; ticketType: string }>({
    queryKey: ['transfer', token],
    queryFn: async () => {
      try {
        return await apiGet(`/transfers/${token}`);
      } catch (err: any) {
        if (err.status === 410) throw new Error('EXPIRED');
        if (err.status === 409) throw new Error('RESOLVED');
        throw new Error('NOT_FOUND');
      }
    },
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      try {
        return await apiPost(`/transfers/${token}/accept`, {});
      } catch (err: any) {
        throw new Error(err.message || 'Không thể nhận vé lúc này');
      }
    },
    onSuccess: (data: any) => {
      setAcceptedTicketId(data?.ticketId || '');
      setActionSuccess('ACCEPTED');
      queryClient.invalidateQueries({ queryKey: ['myTickets'] });
      // Không invalidate 'transfer' nữa để tránh bị API trả về lỗi 409 chạy ngầm
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      try {
        return await apiPost(`/transfers/${token}/decline`, {});
      } catch (err: any) {
        throw new Error(err.message || 'Không thể từ chối lúc này');
      }
    },
    onSuccess: () => {
      setActionSuccess('DECLINED');
      queryClient.invalidateQueries({ queryKey: ['transfer', token] });
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  if (actionSuccess === 'ACCEPTED') {
    const ticketPath = `/account/tickets/${acceptedTicketId}`;
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
            <h2 className="text-xl font-bold text-green-700 dark:text-green-400">
              Bạn đã nhận vé thành công!
            </h2>
            <p className="mt-2 text-sm text-green-600 dark:text-green-500">
              Vé đã được thêm vào ví của bạn.
            </p>
            {session ? (
              <Button asChild className="mt-6">
                <Link to={ticketPath}>Vào ví vé để xem mã QR</Link>
              </Button>
            ) : (
              <Button asChild className="mt-6">
                <Link to={`/login?redirect=${encodeURIComponent(ticketPath)}`}>
                  Đăng nhập để xem vé
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (actionSuccess === 'DECLINED') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-bold">Đã từ chối nhận vé</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vé đã được hoàn trả lại cho người gửi.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Đang tải thông tin...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    let message = 'Không tìm thấy lời mời tặng vé này.';
    if (error.message === 'EXPIRED')
      message = 'This gift link has expired. The ticket has been returned to the sender.';
    else if (error.message === 'RESOLVED')
      message = 'This gift link has already been resolved (accepted or declined).';

    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Không khả dụng</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="overflow-hidden border-2 shadow-lg">
        <div className="bg-primary/5 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl">Lời mời nhận vé</CardTitle>
          <p className="mt-2 text-muted-foreground">
            <span className="font-semibold text-foreground">
              {transfer?.senderName || 'Một người bạn'}
            </span>{' '}
            đã gửi tặng bạn một vé!
          </p>
        </div>
        <CardContent className="p-6">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-bold">{transfer?.concertName || 'Sự kiện âm nhạc'}</h3>
                <p className="text-sm text-muted-foreground">
                  Loại vé: {transfer?.ticketType || 'Standard'}
                </p>
              </div>
            </div>
          </div>

          {actionError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}

          <div className="mt-8 space-y-3">
            <Button
              className="w-full text-base h-12"
              onClick={() => acceptMutation.mutate()}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {acceptMutation.isPending ? 'Đang nhận...' : 'Accept Gift'}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => declineMutation.mutate()}
              disabled={acceptMutation.isPending || declineMutation.isPending}
            >
              {declineMutation.isPending ? 'Đang từ chối...' : 'Decline'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
