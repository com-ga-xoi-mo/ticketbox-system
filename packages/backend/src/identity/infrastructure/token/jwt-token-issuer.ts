import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type { JwtPayload } from '../../domain/jwt-payload.interface';
import type { TokenIssuerPort } from '../../domain/ports/token-issuer.port';

@Injectable()
export class JwtTokenIssuer implements TokenIssuerPort {
  constructor(private readonly jwtService: JwtService) {}

  issue(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
