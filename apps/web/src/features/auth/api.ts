import { post } from '../../shared/api/client';

export interface LoginResponse {
  accessToken: string;
}

export function loginApi(email: string, password: string): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', { email, password });
}
