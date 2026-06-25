import { useState } from 'react';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { Steps, Result } from 'antd';
import { Loader2, Ticket, CreditCard, CheckCircle2, ChevronLeft } from 'lucide-react';
import type { Order, PaymentProvider } from '@ticketbox/api-types';

import { createOrder, initiatePayment, parseOrderError, validatePromoCode } from '../../shared/api/orders';
import { apiPost } from '../../shared/api/client';
import { generateIdempotencyKey } from '../../shared/lib/idempotency';
import { useCountdown } from '../../shared/hooks/useCountdown';
import { useRequireAuth } from '../../shared/hooks/useRequireAuth';

import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';

import { PromoCodeInput } from './components/PromoCodeInput';
import { OrderPricingBreakdown } from './components/OrderPricingBreakdown';
import { usePromoValidation } from './hooks/usePromoValidation';

interface CheckoutState {
  concertId: string;
  concertSlug: string;
  concertTitle: string;
  quantities: [string, number][];
  idempotencyKey?: string;
}

export function CheckoutPage() {
  const { isAuthenticated } = useRequireAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CheckoutState | null;

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('SIMULATOR');

  const { formatted, isExpired } = useCountdown(createdOrder?.reservationExpiresAt ?? null);

  const { applyPromo, removePromo, promoCode, promoPreview, loading: validatingPromo } = usePromoValidation({
    validatePromoCode,
    concertId: state?.concertId ?? '',
    ticketTypeIds: state?.quantities.map(([id]) => id) ?? [],
  });

  if (!isAuthenticated) {
    return <Navigate to={`/login?returnTo=/checkout`} replace />;
  }

  if (!state || !state.concertId || !state.quantities || state.quantities.length === 0) {
    return <Navigate to="/events" replace />;
  }

  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const idempotencyKey = state?.idempotencyKey || generateIdempotencyKey();
      const order = await createOrder({
        concertId: state!.concertId,
        idempotencyKey,
        items: state!.quantities.map(([ticketTypeId, quantity]) => ({
          ticketTypeId,
          quantity,
        })),
        promoCode: promoCode ?? undefined,
      });
      setCreatedOrder(order);
      setStep(2);
    } catch (error) {
      setErrorMsg(parseOrderError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!createdOrder) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const returnUrl = `${window.location.origin}/orders/${createdOrder.id}/result`;
      
      const res = await initiatePayment(createdOrder.id, {
        idempotencyKey,
        provider: selectedProvider,
        returnUrl,
      });

      if (!res.redirectUrl) {
        throw new Error('No redirect URL returned');
      }

      // Simulator: auto-complete payment with SUCCESS and go straight to result page
      if (selectedProvider === 'SIMULATOR' && res.simulatorToken) {
        await apiPost('/payments/simulator/callback', {
          token: res.simulatorToken,
          outcome: 'success',
        });
        navigate(`/orders/${createdOrder.id}/result`);
        return;
      }

      window.location.href = res.redirectUrl;
    } catch (error) {
      setErrorMsg(parseOrderError(error));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Button variant="ghost" className="mb-4 -ml-4 text-muted-foreground" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2 size-4" />
          Quay lại sự kiện
        </Button>
        <h1 className="text-3xl font-black">Thanh toán vé</h1>
        <p className="text-muted-foreground">{state.concertTitle}</p>
      </div>

      <div className="mb-8 rounded-2xl bg-card p-6 shadow-sm border">
        <Steps
          current={step}
          items={[
            { title: 'Chọn vé', icon: <Ticket className="size-4" /> },
            { title: 'Xác nhận', icon: <CheckCircle2 className="size-4" /> },
            { title: 'Thanh toán', icon: <CreditCard className="size-4" /> },
          ]}
        />
      </div>

      {isExpired ? (
        <Result
          status="warning"
          title="Thời gian giữ vé đã hết"
          subTitle="Vui lòng quay lại trang sự kiện để chọn lại vé."
          extra={[
            <Button key="back" onClick={() => navigate(`/events/${state.concertSlug}`)}>
              Quay lại chọn vé
            </Button>
          ]}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertTitle>Lỗi</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Xác nhận đơn hàng</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Vui lòng kiểm tra lại thông tin vé trước khi tiếp tục.
                  </p>

                  <div className="rounded-lg border p-4 bg-muted/20">
                    <h3 className="mb-3 font-semibold text-sm">Mã khuyến mãi</h3>
                    <PromoCodeInput
                      onApply={applyPromo}
                      onRemove={removePromo}
                      appliedPromoCode={promoCode}
                      appliedPromoPreview={promoPreview}
                      loading={validatingPromo}
                    />
                  </div>

                  <Button 
                    className="w-full h-11 rounded-full shadow-lg shadow-primary/20" 
                    onClick={handleCreateOrder} 
                    disabled={isSubmitting || validatingPromo}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 animate-spin size-4" /> : null}
                    Xác nhận đặt vé
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && createdOrder && (
              <Card>
                <CardHeader>
                  <CardTitle>Phương thức thanh toán</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
                    <span className="font-medium">Thời gian giữ vé còn lại</span>
                    <span className="text-xl font-bold font-mono">{formatted}</span>
                  </div>

                  <div className="space-y-2 mt-6">
                    <label className="text-sm font-semibold text-foreground">Chọn cổng thanh toán</label>
                    <div className="grid gap-3">
                      {(['SIMULATOR', 'MOMO', 'VNPAY'] as PaymentProvider[]).map(provider => (
                        <div 
                          key={provider}
                          className={`border rounded-xl p-4 cursor-pointer flex items-center transition-all ${selectedProvider === provider ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}
                          onClick={() => setSelectedProvider(provider)}
                        >
                          <div className={`size-4 rounded-full border flex items-center justify-center mr-3 ${selectedProvider === provider ? 'border-primary' : 'border-input'}`}>
                            {selectedProvider === provider && <div className="size-2 rounded-full bg-primary" />}
                          </div>
                          <span className="font-medium">{provider === 'SIMULATOR' ? 'Trình giả lập (Test)' : provider}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full h-11 rounded-full shadow-lg shadow-primary/20" 
                    onClick={handlePayment} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 animate-spin size-4" /> : null}
                    Thanh toán
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Tóm tắt đơn hàng</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {createdOrder ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">Mã đơn: <Badge variant="outline">{createdOrder.orderNumber}</Badge></div>
                    {createdOrder.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.ticketTypeName || 'Vé'} x {item.quantity}</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.totalPriceVnd)}
                        </span>
                      </div>
                    ))}
                    <OrderPricingBreakdown
                      subtotalVnd={createdOrder.subtotalVnd ?? createdOrder.totalAmountVnd}
                      discountAmountVnd={createdOrder.discountAmountVnd ?? 0}
                      serviceFeeVnd={createdOrder.serviceFeeVnd ?? 0}
                      totalAmountVnd={createdOrder.totalAmountVnd}
                      promoCode={createdOrder.promoCode}
                    />
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>Số lượng vé: {state.quantities.reduce((acc, [_, q]) => acc + q, 0)}</p>
                    {promoPreview && (
                      <p className="mt-2 text-green-600">
                        * Đã áp dụng mã giảm giá {promoCode}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
