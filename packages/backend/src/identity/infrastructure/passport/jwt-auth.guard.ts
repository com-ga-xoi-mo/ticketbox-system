import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard.
 *
 * Verifies the Bearer token in the Authorization header using the 'jwt'
 * Passport strategy. Returns 401 Unauthorized if the token is missing or invalid.
 *
 * Lives in infrastructure/passport because it depends on Passport.js internals.
 * Other modules import JwtAuthGuard from auth.module.ts re-exports.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
