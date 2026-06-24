import { cn } from './cn';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
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
