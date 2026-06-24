import {
  LoginRequestSchema,
  LoginResponseSchema,
  type LoginRequest,
} from '@ticketbox/api-types';
import { apiPost } from './client';

export async function loginRequest(credentials: LoginRequest): Promise<string> {
  const validated = LoginRequestSchema.parse(credentials);
  const data = await apiPost<unknown>('/auth/login', validated);
  const { accessToken } = LoginResponseSchema.parse(data);
  return accessToken;
}
