import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

import type { QrTokenHasherPort } from '../../domain/ports/qr-token-hasher.port';

@Injectable()
export class Sha256QrTokenHasher implements QrTokenHasherPort {
  hashPayload(payload: string): string {
    return createHash('sha256').update(payload).digest('hex');
  }
}
