import { AlertCircle, Calendar, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { useMyTickets } from '../../shared/api/tickets';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { TicketStatusBadge } from './components/TicketStatusBadge';

export function MyTicketsPage() {
  return (
    <AudienceProtectedRoute>
      <MyTicketsContent />
    </AudienceProtectedRoute>
  );
}

function MyTicketsContent() {
  const { data: tickets, isLoading, isError, refetch } = useMyTickets();

  const sortedTickets = tickets
    ? [...tickets].sort(
        (a, b) =>
          new Date(a.concertStartsAt).getTime() -
          new Date(b.concertStartsAt).getTime(),
      )
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Vé của tôi</h1>
          <p className="mt-2 text-muted-foreground">
            Quản lý vé điện tử và mã QR để check-in.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/account">Quay lại</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            Không thể tải danh sách vé.
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full sm:ml-4 sm:w-auto"
              onClick={() => refetch()}
            >
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {sortedTickets.length === 0 ? (
            <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
              <Ticket className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Chưa có vé nào</h3>
              <p className="mb-6 text-muted-foreground">
                Bạn chưa có vé nào trong tài khoản.
              </p>
              <Button asChild>
                <Link to="/events">Khám phá sự kiện</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/account/tickets/${ticket.id}`}
                  className="block h-full"
                >
                  <Card className="flex h-full flex-col transition-colors hover:bg-muted/50">
                    <CardContent className="flex flex-1 flex-col p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="font-mono text-sm font-medium text-muted-foreground">
                          {ticket.ticketNumber}
                        </span>
                        <TicketStatusBadge status={ticket.status} />
                      </div>

                      <h3 className="mb-4 line-clamp-2 flex-1 text-lg font-semibold">
                        {ticket.concertTitle}
                      </h3>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span>
                            {new Date(ticket.concertStartsAt).toLocaleString('vi-VN', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <Ticket className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>Loại vé: {ticket.ticketTypeName}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
