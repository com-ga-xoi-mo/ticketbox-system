import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Result, Skeleton } from 'antd';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useConcertList } from '../../shared/api/catalog';
import { apiGet, apiPost } from '../../shared/api/client';
import { useOrderDetail } from '../../shared/api/orders';
import { PageError, PageLoading } from '../../shared/ui/PageStates';

export function PaymentResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const callbackSyncStarted = useRef(false);
  const { data: concerts } = useConcertList();

  const { data: order, isLoading, isError, refetch } = useOrderDetail(
    id ?? '',
    !hasTimedOut && id ? 3000 : false,
  );

  const isTerminal =
    order?.status === 'PAID' ||
    order?.status === 'FAILED' ||
    order?.status === 'EXPIRED' ||
    order?.status === 'CANCELLED';
  const concertSlug = concerts?.find((concert) => concert.id === order?.concertId)?.slug;
  const selectTicketsHref = concertSlug ? `/events/${concertSlug}` : '/events';

  useEffect(() => {
    if (!id || hasTimedOut || !order || order.status !== 'PENDING_PAYMENT') return;

    const timeout = setTimeout(() => {
      setHasTimedOut(true);
    }, 120000);

    return () => clearTimeout(timeout);
  }, [id, hasTimedOut, order]);

  // Local fallback when the browser return arrives before the public IPN.
  // The backend still verifies the provider signature before changing state.
  useEffect(() => {
    if (
      !location.search ||
      order?.status !== 'PENDING_PAYMENT' ||
      callbackSyncStarted.current
    ) {
      return;
    }

    callbackSyncStarted.current = true;

    const syncCallback = async () => {
      if (location.search.includes('vnp_')) {
        await apiGet(`/payments/vnpay/ipn${location.search}`);
      } else if (location.search.includes('resultCode=')) {
        const params = new URLSearchParams(location.search);
        const payload = Object.fromEntries(params.entries());

        await apiPost('/payments/momo/ipn', {
          ...payload,
          amount: Number(payload.amount),
          resultCode: Number(payload.resultCode),
          responseTime: Number(payload.responseTime),
          ...(payload.transId ? { transId: Number(payload.transId) } : {}),
        });
      } else {
        callbackSyncStarted.current = false;
        return;
      }

      await refetch();
    };

    syncCallback().catch((error: unknown) => {
      callbackSyncStarted.current = false;
      console.error('Unable to synchronize payment callback', error);
    });
  }, [location.search, order?.status, refetch]);

  useEffect(() => {
    if (isTerminal && !hasTimedOut) {
      setHasTimedOut(true);
    }
  }, [isTerminal, hasTimedOut]);

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError) {
    return <PageError message="Không thể tải trạng thái thanh toán." />;
  }

  if (!order) {
    return <PageError message="Không tìm thấy đơn hàng." />;
  }

  if (order.status === 'PAID') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Result
          status="success"
          title="Thanh toán thành công!"
          subTitle={`Mã đơn hàng: ${order.orderNumber} - Số tiền: ${new Intl.NumberFormat(
            'vi-VN',
            { style: 'currency', currency: 'VND' },
          ).format(order.totalAmountVnd)}`}
          extra={[
            <Link key="view" to={`/orders/${order.id}`}>
              <Button className="rounded-full px-8">Xem vé</Button>
            </Link>,
          ]}
        />
      </div>
    );
  }

  if (order.status === 'FAILED' || order.status === 'CANCELLED') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Result
          status="error"
          title="Thanh toán thất bại"
          subTitle="Đã có lỗi xảy ra trong quá trình thanh toán, hoặc bạn đã hủy giao dịch."
          extra={[
            <Link key="retry" to={selectTicketsHref}>
              <Button className="rounded-full px-8">Thử lại (Chọn lại vé)</Button>
            </Link>,
          ]}
        />
      </div>
    );
  }

  if (order.status === 'EXPIRED') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Result
          status="warning"
          title="Đơn hàng đã hết hạn"
          subTitle="Thời gian giữ vé của bạn đã kết thúc do không hoàn tất thanh toán kịp thời."
          extra={[
            <Link key="back" to={selectTicketsHref}>
              <Button className="rounded-full px-8">Quay lại sự kiện</Button>
            </Link>,
          ]}
        />
      </div>
    );
  }

  if (hasTimedOut && order.status === 'PENDING_PAYMENT') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Result
          status="info"
          title="Đang xử lý thanh toán"
          subTitle="Hệ thống đang chờ phản hồi từ cổng thanh toán. Vui lòng kiểm tra lại trạng thái sau ít phút."
          extra={[
            <Link key="orders" to="/orders">
              <Button className="rounded-full px-8">Đơn hàng của tôi</Button>
            </Link>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-10 animate-spin" />
        </div>
      </div>
      <h2 className="mb-2 text-2xl font-bold">Đang xử lý thanh toán...</h2>
      <p className="mb-8 text-muted-foreground">
        Vui lòng không đóng trình duyệt trong lúc này.
      </p>
      <div className="mx-auto max-w-sm">
        <Skeleton active paragraph={{ rows: 2 }} />
      </div>
    </div>
  );
}
