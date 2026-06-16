import type {
  CheckinMobileApiClient,
  LoginRequest,
  MobileSession,
  OnlineScanRequest,
  OnlineScanResult,
  StaffAssignment,
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
    return this.request<MobileSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async listStaffAssignments(accessToken: string): Promise<readonly StaffAssignment[]> {
    return this.request<readonly StaffAssignment[]>('/checkin/assignments', { method: 'GET' }, accessToken);
  }

  async submitOnlineScan(accessToken: string, request: OnlineScanRequest): Promise<OnlineScanResult> {
    return this.request<OnlineScanResult>(
      '/checkin/scan',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      accessToken,
    );
  }

  private async request<T>(path: string, init: RequestInit, accessToken?: string): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');

    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new ApiRequestError(readErrorMessage(payload), response.status);
    }

    return payload as T;
  }
}

function readErrorMessage(payload: unknown): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return 'Request failed';
}
