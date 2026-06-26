import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SseMessage {
  readonly data: string;
  readonly type?: string;
}

/**
 * In-memory registry of open SSE streams per user for THIS API instance. The Redis
 * subscriber routes per-user signals here; each connection registers/unregisters its own
 * Subject. Signals for a user with no local stream are simply dropped (no error).
 */
@Injectable()
export class NotificationStreamRegistry {
  private readonly streams = new Map<string, Set<Subject<SseMessage>>>();

  add(userId: string, stream: Subject<SseMessage>): void {
    const set = this.streams.get(userId) ?? new Set();
    set.add(stream);
    this.streams.set(userId, set);
  }

  remove(userId: string, stream: Subject<SseMessage>): void {
    const set = this.streams.get(userId);
    if (!set) return;
    set.delete(stream);
    if (set.size === 0) {
      this.streams.delete(userId);
    }
  }

  emit(userId: string, message: SseMessage): void {
    const set = this.streams.get(userId);
    if (!set) return;
    for (const stream of set) {
      stream.next(message);
    }
  }
}
