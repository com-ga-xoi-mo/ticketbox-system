import { FormEvent, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Download,
  LifeBuoy,
  Mail,
  ReceiptText,
  RefreshCw,
  RotateCw,
} from 'lucide-react';
import type { RefundRequestReason, SupportRequestCategory } from '@ticketbox/api-types';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import {
  parseSupportError,
  useCreateRefundRequest,
  useCreateSupportRequest,
  useRefundEligibility,
  useRefundRequests,
  useSupportRequests,
} from '../../shared/api/support';
import { useResendOrderTickets, useResendTicket } from '../../shared/api/downloads';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  formatDateTime,
  formatVnd,
  refundReasonLabels,
  refundStatusLabels,
  supportCategoryLabels,
  supportStatusLabels,
} from './supportLabels';

const supportCategories = Object.keys(supportCategoryLabels) as SupportRequestCategory[];
const refundReasons = Object.keys(refundReasonLabels) as RefundRequestReason[];

function useContextParams() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? undefined;
  const ticketId = searchParams.get('ticketId') ?? undefined;
  const tab = searchParams.get('tab') ?? undefined;
  const context = orderId ? { orderId } : ticketId ? { ticketId } : {};
  return { orderId, ticketId, context, tab };
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function Timeline({ items }: { items: Array<{ id: string; status: string; note?: string | null; createdAt: string }> }) {
  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="grid grid-cols-[auto_1fr] gap-3">
          <span className="mt-1 size-2 rounded-full bg-primary" />
          <div>
            <p className="font-medium">{item.status}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
            {item.note && <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SupportCenterPage() {
  const { orderId, ticketId, context, tab } = useContextParams();
  const [supportCategory, setSupportCategory] = useState<SupportRequestCategory>(
    ticketId ? 'TICKET_HELP' : orderId ? 'ORDER_HELP' : 'ACCOUNT_HELP',
  );
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [refundReason, setRefundReason] = useState<RefundRequestReason>('CANNOT_ATTEND');
  const [refundMessage, setRefundMessage] = useState('');
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const supportRequests = useSupportRequests();
  const refundRequests = useRefundRequests();
  const refundEligibility = useRefundEligibility(context);
  const createSupport = useCreateSupportRequest();
  const createRefund = useCreateRefundRequest();
  const resendOrder = useResendOrderTickets();
  const resendTicketMutation = useResendTicket();

  const activeContextLabel = useMemo(() => {
    if (orderId) return `Đơn hàng ${orderId.slice(0, 8)}`;
    if (ticketId) return `Vé ${ticketId.slice(0, 8)}`;
    return 'Tài khoản';
  }, [orderId, ticketId]);

  const handleSupportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormNotice(null);
    createSupport.mutate(
      {
        ...context,
        category: supportCategory,
        subject: supportSubject,
        message: supportMessage,
      },
      {
        onSuccess: () => {
          setSupportSubject('');
          setSupportMessage('');
          setFormNotice('Yêu cầu hỗ trợ đã được gửi.');
        },
      },
    );
  };

  const handleRefundSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormNotice(null);
    createRefund.mutate(
      {
        ...context,
        reason: refundReason,
        message: refundMessage || undefined,
      },
      {
        onSuccess: () => {
          setRefundMessage('');
          setFormNotice('Yêu cầu hoàn tiền đã được gửi. Đây là quy trình xét duyệt, chưa phải hoàn tiền qua cổng thanh toán.');
        },
      },
    );
  };

  const handleResend = () => {
    if (orderId) resendOrder.mutate(orderId, { onSuccess: (data) => setFormNotice(data.message) });
    if (ticketId) resendTicketMutation.mutate(ticketId, { onSuccess: (data) => setFormNotice(data.message) });
  };

  const supportError = createSupport.error ? parseSupportError(createSupport.error) : null;
  const refundError = createRefund.error ? parseSupportError(createRefund.error) : null;
  const resendError =
    resendOrder.error || resendTicketMutation.error
      ? parseSupportError(resendOrder.error ?? resendTicketMutation.error)
      : null;

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Badge variant="secondary" className="mb-3">Trung tâm hỗ trợ</Badge>
            <h1 className="text-3xl font-black tracking-tight">Hỗ trợ sau mua</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Theo dõi hỗ trợ, gửi yêu cầu hoàn tiền, gửi lại email vé và tải xác nhận mua cho tài khoản của bạn.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/account/notifications">
                <Bell className="mr-2 h-4 w-4" />
                Thông báo
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/account/orders">
                <ReceiptText className="mr-2 h-4 w-4" />
                Đơn hàng
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Tabs defaultValue={tab || (orderId || ticketId ? 'support' : 'history')} className="min-w-0">
            <TabsList className="grid h-auto w-full grid-cols-3">
              <TabsTrigger value="support">Hỗ trợ</TabsTrigger>
              <TabsTrigger value="refund">Hoàn tiền</TabsTrigger>
              <TabsTrigger value="history">Lịch sử</TabsTrigger>
            </TabsList>

            <TabsContent value="support" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 text-primary" />
                    Tạo yêu cầu hỗ trợ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSupportSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="support-category">Loại hỗ trợ</label>
                        <Select value={supportCategory} onValueChange={(value) => setSupportCategory(value as SupportRequestCategory)}>
                          <SelectTrigger id="support-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {supportCategories.map((category) => (
                              <SelectItem key={category} value={category}>{supportCategoryLabels[category]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="support-subject">Tiêu đề</label>
                        <Input
                          id="support-subject"
                          value={supportSubject}
                          onChange={(event) => setSupportSubject(event.target.value)}
                          placeholder="Tôi cần hỗ trợ về..."
                          required
                          minLength={3}
                          maxLength={180}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="support-message">Nội dung</label>
                      <textarea
                        id="support-message"
                        className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        value={supportMessage}
                        onChange={(event) => setSupportMessage(event.target.value)}
                        placeholder="Mô tả vấn đề để đội hỗ trợ kiểm tra nhanh hơn."
                        required
                        minLength={10}
                        maxLength={4000}
                      />
                    </div>
                    {supportError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Không thể gửi yêu cầu</AlertTitle>
                        <AlertDescription>{supportError}</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" disabled={createSupport.isPending}>
                      <Mail className="mr-2 h-4 w-4" />
                      {createSupport.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="refund" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCw className="h-5 w-5 text-primary" />
                    Yêu cầu hoàn tiền
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orderId || ticketId ? (
                    <>
                      {refundEligibility.isLoading ? (
                        <Skeleton className="h-20 w-full" />
                      ) : refundEligibility.data ? (
                        <Alert className={refundEligibility.data.eligible ? 'border-emerald-500/40 bg-emerald-500/10' : ''}>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>
                            {refundEligibility.data.eligible ? 'Có thể gửi yêu cầu' : 'Chưa đủ điều kiện'}
                          </AlertTitle>
                          <AlertDescription>
                            {refundEligibility.data.message}
                            {refundEligibility.data.refundableAmountVnd != null && (
                              <span className="mt-2 block font-medium">
                                Giá trị dự kiến: {formatVnd(refundEligibility.data.refundableAmountVnd)}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      <form className="space-y-4" onSubmit={handleRefundSubmit}>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="refund-reason">Lý do</label>
                          <Select value={refundReason} onValueChange={(value) => setRefundReason(value as RefundRequestReason)}>
                            <SelectTrigger id="refund-reason">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {refundReasons.map((reason) => (
                                <SelectItem key={reason} value={reason}>{refundReasonLabels[reason]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="refund-message">Ghi chú</label>
                          <textarea
                            id="refund-message"
                            className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            value={refundMessage}
                            onChange={(event) => setRefundMessage(event.target.value)}
                            placeholder="Thông tin bổ sung cho đội hỗ trợ."
                            maxLength={4000}
                          />
                        </div>
                        {refundError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Không thể gửi yêu cầu hoàn tiền</AlertTitle>
                            <AlertDescription>{refundError}</AlertDescription>
                          </Alert>
                        )}
                        <Button
                          type="submit"
                          disabled={createRefund.isPending || !refundEligibility.data?.eligible}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {createRefund.isPending ? 'Đang gửi...' : 'Gửi yêu cầu hoàn tiền'}
                        </Button>
                      </form>
                    </>
                  ) : (
                    <EmptyState>
                      Chọn một đơn hàng hoặc vé trước khi gửi yêu cầu hoàn tiền.
                      <div className="mt-4 flex justify-center gap-2">
                        <Button variant="outline" asChild><Link to="/account/orders">Chọn đơn hàng</Link></Button>
                        <Button variant="outline" asChild><Link to="/account/tickets">Chọn vé</Link></Button>
                      </div>
                    </EmptyState>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4 grid gap-4">
              <Card>
                <CardHeader><CardTitle>Yêu cầu hỗ trợ gần đây</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {supportRequests.isLoading ? <Skeleton className="h-24 w-full" /> : null}
                  {supportRequests.data?.length ? supportRequests.data.map((item) => (
                    <Link key={item.id} to={`/account/support/requests/${item.id}`} className="block rounded-lg border p-4 no-underline transition hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{item.subject}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{supportCategoryLabels[item.category]} · {formatDateTime(item.updatedAt)}</p>
                        </div>
                        <Badge variant="secondary">{supportStatusLabels[item.status]}</Badge>
                      </div>
                    </Link>
                  )) : !supportRequests.isLoading ? <EmptyState>Chưa có yêu cầu hỗ trợ.</EmptyState> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Yêu cầu hoàn tiền</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {refundRequests.isLoading ? <Skeleton className="h-24 w-full" /> : null}
                  {refundRequests.data?.length ? refundRequests.data.map((item) => (
                    <Link key={item.id} to={`/account/support/refunds/${item.id}`} className="block rounded-lg border p-4 no-underline transition hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{refundReasonLabels[item.reason]}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatVnd(item.requestedAmountVnd)} · {formatDateTime(item.updatedAt)}</p>
                        </div>
                        <Badge variant="secondary">{refundStatusLabels[item.status]}</Badge>
                      </div>
                    </Link>
                  )) : !refundRequests.isLoading ? <EmptyState>Chưa có yêu cầu hoàn tiền.</EmptyState> : null}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <aside className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Ngữ cảnh</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="font-medium">{activeContextLabel}</p>
                <p className="text-muted-foreground">Yêu cầu hoàn tiền chỉ là yêu cầu xét duyệt, chưa thực hiện hoàn tiền qua cổng thanh toán.</p>
                {(orderId || ticketId) && (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={handleResend} disabled={resendOrder.isPending || resendTicketMutation.isPending}>
                      <Mail className="mr-2 h-4 w-4" />
                      Gửi lại email vé
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to={ticketId ? `/account/tickets/${ticketId}/download` : `/account/orders/${orderId}/confirmation`}>
                        <Download className="mr-2 h-4 w-4" />
                        Tải bản xác nhận
                      </Link>
                    </Button>
                  </div>
                )}
                {resendError && <p className="text-destructive">{resendError}</p>}
                {formNotice && <p className="rounded-lg bg-emerald-500/10 p-3 text-emerald-700">{formNotice}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Đi nhanh</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-between" asChild>
                  <Link to="/account/notifications">Trung tâm thông báo <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button variant="ghost" className="w-full justify-between" asChild>
                  <Link to="/account/tickets">Ví vé <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AudienceProtectedRoute>
  );
}

export { Timeline };
