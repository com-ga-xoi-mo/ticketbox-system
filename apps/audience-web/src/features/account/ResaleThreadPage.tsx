import { useParams, Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useThreadMessages, useSendMessage, useMyThreads } from '../../shared/api/messaging';
import { AudienceProtectedRoute } from '../../shared/auth/AudienceProtectedRoute';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Separator } from '../../components/ui/separator';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { ScrollArea } from '../../components/ui/scroll-area';
import { ChevronLeft, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import { Skeleton } from '../../components/ui/skeleton';
import { Alert, AlertDescription } from '../../components/ui/alert';

export function ResaleThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const { data: messages, isLoading } = useThreadMessages(threadId as string);
  const { data: threads } = useMyThreads();
  const { session } = useAuth();
  const [body, setBody] = useState('');
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const thread = threads?.find((t: any) => t.id === threadId);
  const sendMessage = useSendMessage(thread?.listingId, threadId);

  useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    sendMessage.mutate(body, {
      onSuccess: () => setBody('')
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AudienceProtectedRoute>
      <div className="mx-auto max-w-2xl px-4 py-6 h-[calc(100vh-80px)] flex flex-col">
        <div className="flex flex-col mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" asChild size="icon" className="shrink-0 rounded-full hover:bg-muted">
              <Link to="/account/messages"><ChevronLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="font-bold text-lg truncate">
              {thread ? thread.listing.concert.title : 'Đang tải...'}
            </div>
          </div>
          <Separator />
        </div>

        <ScrollArea 
          viewportRef={scrollViewportRef}
          className="flex-1 mb-6 p-6 bg-muted/10 rounded-xl border"
        >
          <div className="flex flex-col gap-6">
            {messages?.map((m: any, idx: number) => {
              const isMe = m.senderId === session?.sub;
              const showAvatar = idx === messages.length - 1 || messages[idx + 1]?.senderId !== m.senderId;

              return (
                <div key={m.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className="w-8 shrink-0 flex items-end">
                      {showAvatar && (
                        <Avatar className="w-8 h-8 border">
                          <AvatarFallback className="text-[10px] bg-secondary">
                            {isMe ? 'ME' : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                  
                  <div 
                    className={`max-w-[75%] px-4 py-2.5 text-sm ${
                      isMe 
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm' 
                        : 'bg-muted/60 text-foreground border rounded-2xl rounded-bl-sm'
                    }`}
                  >
                    {m.body}
                  </div>
                  
                  {isMe && (
                    <div className="w-8 shrink-0 flex items-end">
                      {showAvatar && (
                        <Avatar className="w-8 h-8 border">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            ME
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {messages?.length === 0 && (
              <div className="text-center h-full flex items-center justify-center text-muted-foreground text-sm font-medium">
                Chưa có tin nhắn nào. Hãy gửi lời chào!
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-auto shrink-0">
          {thread?.isClosed ? (
            <Alert variant="destructive" className="py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-medium">Cuộc hội thoại đã kết thúc vì vé đã được bán hoặc hết hạn.</AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
              <Input 
                value={body} 
                onChange={e => setBody(e.target.value)} 
                placeholder="Nhập tin nhắn..." 
                disabled={sendMessage.isPending}
                className="rounded-full bg-muted/30 focus-visible:ring-1 border-muted-foreground/20 h-11 px-5"
                autoFocus
              />
              <Button 
                type="submit" 
                disabled={!body.trim() || sendMessage.isPending}
                size="icon"
                className="h-11 w-11 rounded-full shrink-0 shadow-sm"
              >
                <Send className="h-4 w-4 ml-0.5" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </AudienceProtectedRoute>
  );
}

