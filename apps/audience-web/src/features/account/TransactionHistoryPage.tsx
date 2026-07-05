import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../shared/api/client';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { CreditCard } from 'lucide-react';

export function TransactionHistoryPage() {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['resale-transactions'],
    queryFn: async () => {
      return apiGet<any[]>('/me/resale/transactions');
    }
  });

  return (
    <AudienceProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <CreditCard className="w-6 h-6" /> Lịch sử bán vé
        </h1>

        {isLoading ? (
          <div>Loading...</div>
        ) : transactions?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
            Chưa có giao dịch bán vé nào.
          </div>
        ) : (
          <div className="space-y-4">
            {transactions?.map((tx: any) => (
              <Card key={tx.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{tx.listing.concert.title}</h3>
                      <div className="text-sm text-muted-foreground">Loại vé: {tx.listing.ticketType.name}</div>
                      <div className="text-sm text-muted-foreground">Ngày bán: {new Date(tx.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <Badge variant={tx.payoutStatus === 'PROCESSED' ? 'default' : 'secondary'}>
                      {tx.payoutStatus === 'PROCESSED' ? 'Đã thanh toán' : 'Chờ xử lý'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 border-t pt-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Giá bán</div>
                      <div className="font-semibold">{tx.salePriceVnd.toLocaleString('vi-VN')} đ</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Phí nền tảng</div>
                      <div className="font-semibold text-destructive">-{tx.platformFeeVnd.toLocaleString('vi-VN')} đ</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Thực nhận</div>
                      <div className="font-bold text-primary">{tx.sellerPayoutVnd.toLocaleString('vi-VN')} đ</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
