import { Injectable } from '@nestjs/common';

import { RateLimitPolicy } from './rate-limit-policy';

interface RateLimitRequest {
  readonly ip?: string;
  readonly ips?: string[];
  readonly headers?: Record<string, string | string[] | undefined>;
  readonly params?: Record<string, string | undefined>;
  readonly body?: Record<string, unknown>;
  readonly socket?: { readonly remoteAddress?: string };
  readonly user?: {
    readonly id?: string;
    readonly roles?: readonly string[];
  };
}

@Injectable()
export class RateLimitActorKeyService {
  derive(policy: RateLimitPolicy, request: RateLimitRequest): string {
    switch (policy) {
      case RateLimitPolicy.BROWSING:
        return `ip:${this.clientIp(request)}`;
      case RateLimitPolicy.CHECKOUT:
        return `user:${request.user?.id ?? this.clientIp(request)}`;
      case RateLimitPolicy.PAYMENT_INITIATION:
        return [
          `user:${request.user?.id ?? this.clientIp(request)}`,
          `order:${request.params?.id ?? 'unknown'}`,
        ].join(':');
      case RateLimitPolicy.ADMIN_WRITE:
        return [
          `roles:${[...(request.user?.roles ?? [])].sort().join(',') || 'unknown'}`,
          `user:${request.user?.id ?? this.clientIp(request)}`,
        ].join(':');
      case RateLimitPolicy.CHECKIN_SYNC:
        return this.checkinDeviceKey(request);
      default:
        return `ip:${this.clientIp(request)}`;
    }
  }

  private checkinDeviceKey(request: RateLimitRequest): string {
    const headerDeviceId = this.header(request, 'x-device-id');
    const bodyDeviceId = request.body?.deviceId;

    if (headerDeviceId) {
      return `device:${headerDeviceId}`;
    }

    if (typeof bodyDeviceId === 'string' && bodyDeviceId.trim().length > 0) {
      return `device:${bodyDeviceId.trim()}`;
    }

    if (request.user?.id) {
      return `staff:${request.user.id}`;
    }

    return `ip:${this.clientIp(request)}`;
  }

  private clientIp(request: RateLimitRequest): string {
    const forwardedFor = this.header(request, 'x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip ?? request.ips?.[0] ?? request.socket?.remoteAddress ?? 'unknown';
  }

  private header(request: RateLimitRequest, name: string): string | undefined {
    const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
