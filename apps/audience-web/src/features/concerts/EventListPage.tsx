import { useQuery } from '@tanstack/react-query';
import { fetchConcertList, catalogKeys } from '../../shared/api/catalog';
import { PageLoading, PageEmpty, PageError } from '../../shared/ui/PageStates';
import { EventCard } from '../../shared/ui/EventCard';
import { Badge } from '../../components/ui/badge';

export function EventListPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: catalogKeys.list(),
    queryFn: fetchConcertList,
  });

  if (isLoading) return <PageLoading />;
  if (isError) return <PageError message="Không thể tải danh sách sự kiện. Vui lòng thử lại." />;
  if (!data || data.length === 0) {
    return (
      <PageEmpty
        title="Chưa có sự kiện nào"
        description="Hãy quay lại sau để khám phá những sự kiện âm nhạc đỉnh cao."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-9">
        <Badge className="mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-primary">Lịch mở bán</Badge>
        <h1 className="text-4xl font-black tracking-tight text-foreground">Sự kiện sắp diễn ra</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Chọn trải nghiệm live tiếp theo của bạn từ danh sách sự kiện được tuyển chọn.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((concert) => (
          <EventCard key={concert.id} concert={concert} />
        ))}
      </div>
    </div>
  );
}
