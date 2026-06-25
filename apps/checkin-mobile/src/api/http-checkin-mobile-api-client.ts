import {
  LoginResponseSchema,
  OnlineScanResponseSchema,
  StaffAssignmentsResponseSchema,
  StaffProfileResponseSchema,
  TicketCacheDeltaResponseSchema,
  TicketCacheFullResponseSchema,
  type LoginRequest,
  type OnlineScanRequest,
  BatchSyncResponseSchema,
  type BatchSyncRequest,
  type BatchSyncResponse,
  type TicketCacheDeltaResponse,
  type TicketCacheFullResponse,
} from '@ticketbox/api-types';
import { z } from 'zod';

import type {
  CheckinMobileApiClient,
  MobileSession,
  OnlineScanResult,
  TicketCacheRequest,
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

export class ApiTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiTransportError';
  }
}

export class ApiResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiResponseValidationError';
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
          return {
            status: 'unauthorized',
            httpStatus: error.status,
            message: error.message,
          };
        }
        if (error.status >= 500) {
          return { status: 'service-error', httpStatus: error.status, message: error.message };
        }
        return { status: 'request-error', httpStatus: error.status, message: error.message };
      }
      if (error instanceof ApiResponseValidationError) {
        return { status: 'unknown-commit', message: error.message };
      }
      return {
        status: 'transport-error',
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async submitBatchSync(
    accessToken: string,
    request: BatchSyncRequest,
  ): Promise<BatchSyncResponse> {
    return this.request(
      '/checkin/sync',
      { method: 'POST', body: JSON.stringify(request) },
      BatchSyncResponseSchema,
      accessToken,
    );
  }

  async fetchTicketCache(
    accessToken: string,
    request: TicketCacheRequest,
  ): Promise<TicketCacheFullResponse | TicketCacheDeltaResponse> {
    const params = new URLSearchParams({
      assignmentId: request.assignmentId,
      concertId: request.concertId,
    });
    if (request.since) params.set('since', request.since);

    const schema = z.union([TicketCacheFullResponseSchema, TicketCacheDeltaResponseSchema]);
    return this.request(
      `/checkin/ticket-cache?${params.toString()}`,
      { method: 'GET' },
      schema,
      accessToken,
    );
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

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new ApiTransportError('Request timed out')),
        5_000,
      );
    });

    let response: FetchResponseLike;
    try {
      response = await Promise.race([
        this.fetchImpl(`${this.baseUrl}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      controller.abort();
      throw error instanceof ApiTransportError
        ? error
        : new ApiTransportError(error instanceof Error ? error.message : 'Network request failed');
    } finally {
      clearTimeout(timeoutId!);
    }

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
