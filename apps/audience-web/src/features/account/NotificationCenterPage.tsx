import { Link, useSearchParams } from 'react-router-dom';
import { Bell, CheckCheck, Circle, Inbox } from 'lucide-react';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import {
  useAudienceNotifications,
  useMarkAllAudienceNotificationsRead,
  useMarkAudienceNotificationRead,
} from '../../shared/api/notifications';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  formatDateTime,
  notificationActionPath,
  notificationResourceLabels,
  notificationTypeLabels,
} from './supportLabels';

const notificationFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unread', label: 'Chưa đọc' },
  { value: 'PURCHASE_CONFIRMATION', label: 'Mua vé' },
  { value: 'CONCERT_REMINDER', label: 'Nhắc lịch' },
  { value: 'SUPPORT_UPDATE', label: 'Hỗ trợ' },
  { value: 'REFUND_UPDATE', label: 'Hoàn tiền' },
  { value: 'TICKET_UPDATE', label: 'Vé' },
];

export function NotificationCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') ?? 'all';
  const notifications = useAudienceNotifications({
    unreadOnly: filter === 'unread',
    type: filter !== 'all' && filter !== 'unread' ? filter : undefined,
  });
  const markRead = useMarkAudienceNotificationRead();
  const markAllRead = useMarkAllAudienceNotificationsRead();

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">Thông báo</Badge>
            <h1 className="text-3xl font-black tracking-tight">Trung tâm thông báo</h1>
            <p className="mt-2 text-muted-foreground">
              Xác nhận mua vé, nhắc lịch, hỗ trợ, hoàn tiền và cập nhật liên quan đến vé.
            </p>
          </div>
          <Button variant="outline" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Đánh dấu tất cả đã đọc
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(value) => setSearchParams(value === 'all' ? {} : { filter: value })}>
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start">
            {notificationFilters.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Hộp thư của bạn
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : notifications.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Không thể tải thông báo</AlertTitle>
                <AlertDescription>Vui lòng thử lại sau.</AlertDescription>
              </Alert>
            ) : notifications.data?.length ? (
              notifications.data.map((item) => {
                const actionPath = notificationActionPath(item.resourceType, item.resourceId, item.actionUrl);
                const content = (
                  <div className="flex gap-3">
                    <span className="mt-1">
                      {item.readAt ? (
                        <Circle className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <span className="block size-3 rounded-full bg-primary" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {notificationTypeLabels[item.type as keyof typeof notificationTypeLabels] ?? item.type}
                        </Badge>
                        {item.resourceType && (
                          <span className="text-xs text-muted-foreground">
                            {notificationResourceLabels[item.resourceType]}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 font-semibold text-foreground">{item.subject ?? 'Thông báo mới'}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                );

                return (
                  <div key={item.id} className="rounded-lg border p-4 transition hover:bg-muted/30">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                      {actionPath ? (
                        <Link to={actionPath} className="block no-underline">{content}</Link>
                      ) : (
                        content
                      )}
                      {!item.readAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markRead.mutate(item.id)}
                          disabled={markRead.isPending}
                        >
                          Đã đọc
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                <Inbox className="mx-auto mb-3 h-8 w-8" />
                Chưa có thông báo nào.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AudienceProtectedRoute>
  );
}
