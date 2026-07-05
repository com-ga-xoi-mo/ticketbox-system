import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const STREAM_SCOPE = 'notif-stream';
const STREAM_TOKEN_TTL = '60s';

interface StreamTokenPayload {
  sub: string;
  scope: string;
}

/**
 * Mints and verifies short-lived, single-purpose tokens used to open the notification SSE
 * stream. Because `EventSource` cannot send an Authorization header, the client passes this
 * token as a query param; the short TTL + dedicated scope limit the blast radius if the URL
 * leaks. The long-lived session JWT is never placed in the stream URL.
 */
@Injectable()
export class NotificationStreamTokenService {
  constructor(private readonly jwtService: JwtService) {}

  mint(userId: string): string {
    return this.jwtService.sign(
      { scope: STREAM_SCOPE },
      { subject: userId, expiresIn: STREAM_TOKEN_TTL },
    );
  }

  /** Returns the userId for a valid, in-scope, unexpired token; null otherwise. */
  verify(token: string): string | null {
    try {
      const payload = this.jwtService.verify<StreamTokenPayload>(token);
      if (payload.scope !== STREAM_SCOPE || !payload.sub) {
        return null;
      }
      return payload.sub;
    } catch {
      return null;
    }
  }
}
