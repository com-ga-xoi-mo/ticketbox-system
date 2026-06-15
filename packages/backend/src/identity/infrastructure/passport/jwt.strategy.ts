import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PlatformConfigService } from '../../../platform/config/platform-config.service';
import type { AuthenticatedUser } from '../../domain/authenticated-user.interface';
import type { JwtPayload } from '../../domain/jwt-payload.interface';

/**
 * Passport JWT strategy.
 *
 * Extracts the Bearer token from the Authorization header, verifies its
 * signature, and returns an AuthenticatedUser that NestJS attaches to
 * request.user for all downstream guards and controllers.
 *
 * Lives in infrastructure/passport because it is tightly coupled to the
 * Passport.js library and PlatformConfigService (infrastructure concern).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: PlatformConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { id: payload.sub, roles: payload.roles };
  }
}
