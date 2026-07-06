import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/shared/api/client';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth/AuthContext';
import { ChevronLeft, Upload, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function P2POrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [proofUrl, setProofUrl] = useState('');

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['resale-order', id],
    queryFn: async () => {
      return apiGet<any>(`/resale/orders/${id}`);
    },
    refetchInterval: 5000 // Poll every 5s for updates
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      return apiPost(`/resale/orders/${id}/confirm-payment`, { paymentProofUrl: proofUrl });
    },
    onSuccess: () => {
      toast.success('Đã xác nhận thanh toán');
      refetch();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: async () => {
      return apiPost(`/resale/orders/${id}/confirm-receipt`, {});
    },
    onSuccess: () => {
      toast.success('Đã xác nhận nhận tiền, vé đã được chuyển');
      refetch();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const raiseDisputeMutation = useMutation({
    mutationFn: async () => {
      const reason = prompt('Nhập lý do báo cáo sự cố (ví dụ: đã chuyển tiền nhưng chưa nhận vé):');
      if (!reason) return;
      return apiPost(`/resale/orders/${id}/dispute`, { reason });
    },
    onSuccess: () => {
      toast.success('Đã gửi báo cáo sự cố');
      refetch();
    },
    onError: (err: any) => toast.error(err.message)
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      if (!confirm('Bạn có chắc chắn muốn huỷ lệnh này?')) return;
      return apiPost(`/resale/orders/${id}/cancel`, {});
    },
    onSuccess: () => {
      toast.success('Đã huỷ lệnh');
      navigate('/resale');
    },
    onError: (err: any) => toast.error(err.message)
  });

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!order) return <div className="p-12 text-center">Order not found</div>;

  const isBuyer = session?.sub === order.buyerId;
  const isSeller = session?.sub === order.sellerId;

  return (
    <div className="container max-w-2xl py-8">
      <Button variant="ghost" asChild className="mb-6 -ml-4">
        <Link to="/resale"><ChevronLeft className="mr-2 h-4 w-4" /> Quay lại chợ vé</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết giao dịch P2P</CardTitle>
          <CardDescription>Mã giao dịch: {order.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
            <span className="font-medium text-sm text-muted-foreground">Trạng thái</span>
            <span className="font-bold text-primary">{order.status}</span>
          </div>

          {/* BUYER VIEW */}
          {isBuyer && order.status === 'RESERVED' && (
            <div className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Chờ thanh toán</AlertTitle>
                <AlertDescription>
                  Vui lòng chuyển khoản cho người bán trong vòng 15 phút.
                </AlertDescription>
              </Alert>

              <div className="bg-card border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-medium">{order.bankInfo?.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-medium">{order.bankInfo?.bankAccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-medium">{order.bankInfo?.bankAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền cần chuyển:</span>
                  <span className="font-bold text-rose-600">{order.amountVnd?.toLocaleString()} VND</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Link ảnh bill chuyển khoản (Bắt buộc)</label>
                <Input 
                  placeholder="https://imgur.com/..." 
                  value={proofUrl} 
                  onChange={e => setProofUrl(e.target.value)} 
                />
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => confirmPaymentMutation.mutate()} disabled={confirmPaymentMutation.isPending || !proofUrl}>
                  Tôi đã chuyển tiền
                </Button>
                <Button variant="outline" onClick={() => cancelOrderMutation.mutate()} disabled={cancelOrderMutation.isPending}>
                  Huỷ lệnh
                </Button>
              </div>
            </div>
          )}

          {isBuyer && order.status === 'PENDING_CONFIRM' && (
            <div className="space-y-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Đang chờ người bán xác nhận</AlertTitle>
                <AlertDescription>
                  Người bán có 2 giờ để kiểm tra tài khoản và xác nhận nhận tiền.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => raiseDisputeMutation.mutate()}>
                <AlertCircle className="mr-2 h-4 w-4" />
                Báo cáo sự cố
              </Button>
            </div>
          )}

          {/* SELLER VIEW */}
          {isSeller && order.status === 'RESERVED' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Người mua đang thanh toán</AlertTitle>
              <AlertDescription>
                Vui lòng chờ người mua chuyển khoản.
              </AlertDescription>
            </Alert>
          )}

          {isSeller && order.status === 'PENDING_CONFIRM' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cảnh báo</AlertTitle>
                <AlertDescription>
                  Chỉ xác nhận sau khi kiểm tra tài khoản ngân hàng của bạn đã nhận được tiền. 
                  Vé sẽ được chuyển ngay lập tức và không thể hoàn tác.
                </AlertDescription>
              </Alert>
              
              {order.paymentProofUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Ảnh bill do người mua cung cấp:</p>
                  <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline break-all">
                    {order.paymentProofUrl}
                  </a>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => confirmReceiptMutation.mutate()} disabled={confirmReceiptMutation.isPending}>
                  Xác nhận đã nhận tiền
                </Button>
                <Button variant="outline" onClick={() => raiseDisputeMutation.mutate()} disabled={raiseDisputeMutation.isPending}>
                  Báo cáo sự cố
                </Button>
              </div>
            </div>
          )}

          {/* COMMON VIEWS */}
          {order.status === 'COMPLETED' && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Giao dịch thành công</AlertTitle>
              <AlertDescription className="text-green-700">
                {isBuyer ? 'Vé đã được chuyển vào ví của bạn.' : 'Bạn sẽ nhận thanh toán trong vòng 24 giờ.'}
              </AlertDescription>
              {isBuyer && (
                <Button variant="link" asChild className="mt-2 text-green-700">
                  <Link to="/account/tickets">Mở ví vé</Link>
                </Button>
              )}
            </Alert>
          )}

          {order.status === 'CANCELLED' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Đã huỷ</AlertTitle>
              <AlertDescription>Giao dịch này đã bị huỷ.</AlertDescription>
            </Alert>
          )}

          {order.status === 'IN_DISPUTE' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Đang tranh chấp</AlertTitle>
              <AlertDescription>
                Đơn hàng đang trong quá trình xử lý tranh chấp. Admin sẽ liên hệ với bạn qua email.
                <br/>
                Lý do: {order.disputeReason}
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
