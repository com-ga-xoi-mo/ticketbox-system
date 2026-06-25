import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { useMyTickets } from '../../../shared/api/tickets';
import { AuthContext } from '../../../shared/auth/AuthContext';
import { MyTicketCalendar } from './MyTicketCalendar';

export function HomeTicketCalendarWidget() {
  const auth = useContext(AuthContext);
  const isAudience = auth?.session?.roles.includes('AUDIENCE') ?? false;

  if (!isAudience) return null;

  return <AuthenticatedHomeTicketCalendar />;
}

function AuthenticatedHomeTicketCalendar() {
  const { data: tickets = [], isLoading, isError } = useMyTickets();

  if (isLoading) {
    return (
      <Card aria-label="Đang tải lịch vé">
        <CardContent className="space-y-4 py-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) return null;

  return (
    <aside className="space-y-3" aria-label="Lịch vé trên trang chủ">
      <MyTicketCalendar tickets={tickets} />
      <Button variant="outline" className="w-full" asChild>
        <Link to="/account/tickets">Xem tất cả vé của tôi</Link>
      </Button>
    </aside>
  );
}
