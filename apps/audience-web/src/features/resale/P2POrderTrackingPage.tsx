import { useEffect, useState, type ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost, apiPostFormData } from '@/shared/api/client';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth/AuthContext';
import { ChevronLeft, Upload, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type ResaleOrder = {
  id: string;
  buyerId: string;
  sellerId: string;
  status: 'RESERVED' | 'PENDING_CONFIRM' | 'COMPLETED' | 'CANCELLED' | 'IN_DISPUTE';
  amountVnd: number | null;
  bankInfo: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  } | null;
  paymentProofUrl: string | null;
  disputeReason: string | null;
};

const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;
const PAYMENT_PROOF_ACCEPT = 'image/png,image/jpeg,image/webp';

export function P2POrderTrackingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!proofFile) {
      setProofPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(proofFile);
    setProofPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [proofFile]);

  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['resale-order', id],
    queryFn: async () => {
      return apiGet<ResaleOrder>(`/resale/orders/${id}`);
    },
    refetchInterval: 5000,
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!proofFile) throw new Error('Vui lòng chọn ảnh bill chuyển khoản.');
      const formData = new FormData();
      formData.append('file', proofFile);
      return apiPostFormData(`/resale/orders/${id}/confirm-payment`, formData);
    },
    onSuccess: () => {
      setProofFile(null);
      toast.success('Đã tải bill lên, đang chờ người bán xác nhận');
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: async () => {
      return apiPost(`/resale/orders/${id}/confirm-receipt`, {});
    },
    onSuccess: () => {
      toast.success('Đã xác nhận nhận tiền, vé đã được chuyển');
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
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
    onError: (err: Error) => toast.error(err.message),
  });

  const handleProofFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setProofFile(null);
      return;
    }
    if (!PAYMENT_PROOF_ACCEPT.split(',').includes(file.type)) {
      toast.error('Bill phải là ảnh PNG, JPEG hoặc WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > PAYMENT_PROOF_MAX_BYTES) {
      toast.error('Ảnh bill không được vượt quá 5 MB.');
      event.target.value = '';
      return;
    }
    setProofFile(file);
  };

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!order) return <div className="p-12 text-center">Order not found</div>;

  const isBuyer = session?.sub === order.buyerId;
  const isSeller = session?.sub === order.sellerId;

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Button variant="ghost" asChild className="mb-6 -ml-4">
        <Link to="/resale">
          <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại chợ vé
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết giao dịch P2P</CardTitle>
          <CardDescription>Mã giao dịch: {order.id}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
            <span className="font-medium text-sm text-muted-foreground">Trạng thái</span>
            <span className="font-bold text-primary">{order.status}</span>
          </div>

          {/* BUYER VIEW */}
          {isBuyer && order.status === 'RESERVED' && (
            <div className="flex flex-col gap-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Chờ thanh toán</AlertTitle>
                <AlertDescription>
                  Vui lòng chuyển khoản cho người bán trong vòng 15 phút.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-medium">{order.bankInfo?.bankName ?? 'Chưa có'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tài khoản:</span>
                  <span className="font-medium">
                    {order.bankInfo?.bankAccountNumber ?? 'Chưa có'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chủ tài khoản:</span>
                  <span className="font-medium">
                    {order.bankInfo?.bankAccountName ?? 'Chưa có'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền cần chuyển:</span>
                  <span className="font-bold text-primary">
                    {order.amountVnd !== null
                      ? `${order.amountVnd.toLocaleString('vi-VN')} VND`
                      : 'Đang cập nhật'}
                  </span>
                </div>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="payment-proof">Ảnh bill chuyển khoản</FieldLabel>
                  <Input
                    id="payment-proof"
                    type="file"
                    accept={PAYMENT_PROOF_ACCEPT}
                    onChange={handleProofFileChange}
                    disabled={confirmPaymentMutation.isPending}
                  />
                  <FieldDescription>Chấp nhận PNG, JPEG hoặc WebP, tối đa 5 MB.</FieldDescription>
                  {proofPreviewUrl && (
                    <img
                      src={proofPreviewUrl}
                      alt="Xem trước bill chuyển khoản"
                      className="max-h-80 w-full rounded-lg border object-contain"
                    />
                  )}
                </Field>
              </FieldGroup>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => confirmPaymentMutation.mutate()}
                  disabled={confirmPaymentMutation.isPending || !proofFile}
                >
                  <Upload data-icon="inline-start" />
                  {confirmPaymentMutation.isPending ? 'Đang tải bill...' : 'Tôi đã chuyển tiền'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cancelOrderMutation.mutate()}
                  disabled={cancelOrderMutation.isPending}
                >
                  Huỷ lệnh
                </Button>
              </div>
            </div>
          )}

          {isBuyer && order.status === 'PENDING_CONFIRM' && (
            <div className="flex flex-col gap-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Đang chờ người bán xác nhận</AlertTitle>
                <AlertDescription>
                  Người bán có 2 giờ để kiểm tra tài khoản và xác nhận nhận tiền.
                </AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => raiseDisputeMutation.mutate()}
              >
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
              <AlertDescription>Vui lòng chờ người mua chuyển khoản.</AlertDescription>
            </Alert>
          )}

          {isSeller && order.status === 'PENDING_CONFIRM' && (
            <div className="flex flex-col gap-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cảnh báo</AlertTitle>
                <AlertDescription>
                  Chỉ xác nhận sau khi kiểm tra tài khoản ngân hàng của bạn đã nhận được tiền. Vé sẽ
                  được chuyển ngay lập tức và không thể hoàn tác.
                </AlertDescription>
              </Alert>

              {order.paymentProofUrl && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Bill chuyển khoản do người mua tải lên:</p>
                  <a href={order.paymentProofUrl} target="_blank" rel="noreferrer">
                    <img
                      src={order.paymentProofUrl}
                      alt="Bill chuyển khoản của người mua"
                      className="max-h-96 w-full rounded-lg border object-contain"
                    />
                  </a>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => confirmReceiptMutation.mutate()}
                  disabled={confirmReceiptMutation.isPending}
                >
                  Xác nhận đã nhận tiền
                </Button>
                <Button
                  variant="outline"
                  onClick={() => raiseDisputeMutation.mutate()}
                  disabled={raiseDisputeMutation.isPending}
                >
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
                {isBuyer
                  ? 'Vé đã được chuyển vào ví của bạn.'
                  : 'Bạn sẽ nhận thanh toán trong vòng 24 giờ.'}
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
                <br />
                Lý do: {order.disputeReason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
