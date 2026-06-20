import {
  LoginResponseSchema,
  OnlineScanResponseSchema,
  StaffAssignmentsResponseSchema,
  StaffProfileResponseSchema,
  type LoginRequest,
  type OnlineScanRequest,
} from '@ticketbox/api-types';
import type { z } from 'zod';

import type {
  CheckinMobileApiClient,
  MobileSession,
  OnlineScanResult,
} from './checkin-mobile-api.types';

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<FetchResponseLike>;

export interface HttpCheckinMobileApiClientOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: FetchLike;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export class HttpCheckinMobileApiClient implements CheckinMobileApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: HttpCheckinMobileApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async login(request: LoginRequest): Promise<MobileSession> {
    const login = await this.request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      LoginResponseSchema,
    );
    const profile = await this.request(
      '/me/profile',
      { method: 'GET' },
      StaffProfileResponseSchema,
      login.accessToken,
    );

    return { accessToken: login.accessToken, profile };
  }

  async listStaffAssignments(accessToken: string) {
    return this.request(
      '/checkin/assignments',
      { method: 'GET' },
      StaffAssignmentsResponseSchema,
      accessToken,
    );
  }

  async submitOnlineScan(
    accessToken: string,
    request: OnlineScanRequest,
  ): Promise<OnlineScanResult> {
    try {
      return await this.request(
        '/checkin/scan',
        { method: 'POST', body: JSON.stringify(request) },
        OnlineScanResponseSchema,
        accessToken,
      );
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.status === 401 || error.status === 403) {
          return { status: 'unauthorized', message: error.message };
        }
        return { status: 'unavailable', message: error.message };
      }
      if (error instanceof ApiResponseValidationError) {
        return { status: 'unavailable', message: error.message };
      }
      return {
        status: 'network-error',
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private async request<TSchema extends z.ZodTypeAny>(
    path: string,
    init: RequestInit,
    schema: TSchema,
    accessToken?: string,
  ): Promise<z.infer<TSchema>> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');

    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (!response.ok) {
        throw new ApiRequestError('Request failed', response.status);
      }
      throw new ApiResponseValidationError(`Invalid response from ${path}`);
    }

    if (!response.ok) {
      throw new ApiRequestError(readErrorMessage(payload), response.status);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiResponseValidationError(`Invalid response from ${path}`);
    }
    return parsed.data;
  }
}

export class ApiResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiResponseValidationError';
  }
}

function readErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(', ');
    }
  }

  return 'Request failed';
}
