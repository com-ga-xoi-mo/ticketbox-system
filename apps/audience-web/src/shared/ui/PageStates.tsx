import { Link } from 'react-router-dom';
import { SearchX, TicketX, AlertCircle } from 'lucide-react';
import { cn } from './cn';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';

interface PageStateProps {
  className?: string;
}

export function PageLoading({ className }: PageStateProps) {
  return (
    <div className={cn('mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8', className)}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="border-white/70 bg-card/80 shadow-sm">
            <Skeleton className="aspect-[4/3] rounded-t-xl" />
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function PageEmpty({
  title = 'Không có dữ liệu',
  description,
  className,
}: PageStateProps & { title?: string; description?: string }) {
  return (
    <div className={cn('mx-auto max-w-2xl px-4 py-20 text-center', className)}>
      <Card className="border-dashed border-primary/25 bg-card/80 p-8 shadow-sm">
        <CardContent className="p-0">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-primary/10 text-4xl" aria-hidden="true">
            🎫
          </div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-2 text-muted-foreground">{description}</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export function PageError({
  message = 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  className,
}: PageStateProps & { message?: string }) {
  return (
    <div className={cn('mx-auto max-w-2xl px-4 py-20', className)}>
      <Alert variant="destructive" className="bg-card/90">
        <AlertTitle>Không thể tải dữ liệu</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

export function PageNoResults({
  message = 'Không tìm thấy sự kiện nào phù hợp với bộ lọc.',
  onClearFilters,
  className,
}: PageStateProps & { message?: string; onClearFilters?: () => void }) {
  return (
    <div className={cn('mx-auto max-w-2xl px-4 py-20 text-center', className)}>
      <Card className="border-dashed border-muted-foreground/25 bg-card/80 p-8 shadow-sm">
        <CardContent className="p-0">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-muted text-muted-foreground" aria-hidden="true">
            <SearchX className="size-8" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Không tìm thấy kết quả</h2>
          <p className="mt-2 mb-6 text-muted-foreground">{message}</p>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters} className="rounded-full">
              Xóa bộ lọc
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PageSoldOut({ className }: PageStateProps) {
  return (
    <div className={cn('w-full py-8 text-center', className)}>
      <Card className="border-destructive/20 bg-destructive/5 p-6 shadow-sm">
        <CardContent className="p-0">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive" aria-hidden="true">
            <TicketX className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-destructive">Đã hết vé</h2>
          <p className="mt-1 text-sm text-destructive/80">
            Sự kiện này đã bán hết toàn bộ vé. Cảm ơn sự quan tâm của bạn.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PageUnavailable({ className }: PageStateProps) {
  return (
    <div className={cn('mx-auto max-w-2xl px-4 py-20 text-center', className)}>
      <Card className="border-muted bg-card p-8 shadow-sm">
        <CardContent className="p-0">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Sự kiện không tồn tại</h2>
          <p className="mt-2 mb-8 text-muted-foreground">
            Sự kiện bạn đang tìm kiếm có thể đã kết thúc, bị hủy, hoặc đường dẫn không hợp lệ.
          </p>
          <Button asChild className="rounded-full px-8">
            <Link to="/events">Khám phá sự kiện khác</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
