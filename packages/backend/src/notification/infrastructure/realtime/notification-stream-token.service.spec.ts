import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';

import { NotificationStreamTokenService } from './notification-stream-token.service';

const jwt = new JwtService({ secret: 'test-secret' });
const service = new NotificationStreamTokenService(jwt);

describe('NotificationStreamTokenService', () => {
  it('mints a token that verifies back to the user', () => {
    const token = service.mint('user-1');
    expect(service.verify(token)).toBe('user-1');
  });

  it('rejects a token signed with a different secret', () => {
    const other = new NotificationStreamTokenService(new JwtService({ secret: 'other' }));
    const token = other.mint('user-1');
    expect(service.verify(token)).toBeNull();
  });

  it('rejects a token without the stream scope', () => {
    const token = jwt.sign({ scope: 'something-else' }, { subject: 'user-1' });
    expect(service.verify(token)).toBeNull();
  });

  it('rejects a malformed token', () => {
    expect(service.verify('not-a-jwt')).toBeNull();
  });
});
