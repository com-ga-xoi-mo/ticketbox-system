import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-14 text-center">
      <Card className="max-w-md border-white/70 bg-card/90 p-8 shadow-xl">
        <CardContent className="p-0">
          <div className="mb-6 text-6xl" aria-hidden="true">🎭</div>
          <h1 className="mb-3 text-2xl font-black text-foreground">Trang không tồn tại</h1>
          <p className="mb-8 text-muted-foreground">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
          </p>
          <Button asChild className="rounded-full px-6">
            <Link to="/">Về trang chủ</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
