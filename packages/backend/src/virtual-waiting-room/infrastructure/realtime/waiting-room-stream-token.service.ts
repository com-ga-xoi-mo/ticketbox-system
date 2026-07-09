import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

const STREAM_SCOPE = 'waiting-room-stream';
const STREAM_TOKEN_TTL = '60s';

interface WaitingRoomStreamTokenPayload {
  sub: string;
  scope: string;
  concertId: string;
}

@Injectable()
export class WaitingRoomStreamTokenService {
  constructor(private readonly jwtService: JwtService) {}

  mint(userId: string, concertId: string): string {
    return this.jwtService.sign(
      { scope: STREAM_SCOPE, concertId },
      { subject: userId, expiresIn: STREAM_TOKEN_TTL },
    );
  }

  verify(token: string, concertId: string): string | null {
    try {
      const payload = this.jwtService.verify<WaitingRoomStreamTokenPayload>(token);
      if (
        payload.scope !== STREAM_SCOPE ||
        payload.concertId !== concertId ||
        !payload.sub
      ) {
        return null;
      }
      return payload.sub;
    } catch {
      return null;
    }
  }
}
