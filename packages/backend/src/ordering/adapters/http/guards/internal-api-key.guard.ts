import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PlatformConfigService } from '../../../../platform/config/platform-config.service';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(private readonly config: PlatformConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const providedKey = request.headers['x-internal-api-key'];

    if (!providedKey || providedKey !== this.config.internalApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
