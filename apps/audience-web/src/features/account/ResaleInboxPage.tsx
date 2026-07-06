import { Link } from 'react-router-dom';
import { useMyThreads } from '../../shared/api/messaging';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { MessageSquare } from 'lucide-react';

export function ResaleInboxPage() {
  const { data: threads, isLoading } = useMyThreads();

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> Tin nhắn của tôi
        </h1>

        {isLoading ? (
          <div>Loading...</div>
        ) : threads?.length === 0 ? (
          <div className="text-center p-8 bg-muted/20 rounded-lg text-muted-foreground">
            Chưa có tin nhắn nào.
          </div>
        ) : (
          <div className="space-y-4">
            {threads?.map((t: any) => (
              <Card key={t.id} className="overflow-hidden hover:bg-muted/10 transition-colors">
                <Link to={`/account/messages/${t.id}`}>
                  <CardContent className="p-4 flex gap-4 items-center">
                    <div className="flex-1">
                      <div className="font-semibold">{t.listing.concert.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {t.messages[0]?.body || 'Chưa có tin nhắn'}
                      </div>
                    </div>
                    <div className="text-right">
                      {t.unreadCount > 0 && (
                        <Badge variant="destructive" className="mb-1">{t.unreadCount} mới</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.lastMessageAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AudienceProtectedRoute>
  );
}
