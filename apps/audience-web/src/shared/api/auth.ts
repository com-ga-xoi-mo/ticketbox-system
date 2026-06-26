import {
  LoginRequestSchema,
  LoginResponseSchema,
  RegisterRequestSchema,
  type LoginRequest,
  type RegisterRequest,
} from '@ticketbox/api-types';
import { apiPost } from './client';

export async function loginRequest(credentials: LoginRequest): Promise<string> {
  const validated = LoginRequestSchema.parse(credentials);
  const data = await apiPost<unknown>('/auth/login', validated);
  const { accessToken } = LoginResponseSchema.parse(data);
  return accessToken;
}

export async function registerRequest(data: RegisterRequest): Promise<string> {
  const validated = RegisterRequestSchema.parse(data);
  const res = await apiPost<unknown>('/auth/register', validated);
  const { accessToken } = LoginResponseSchema.parse(res);
  return accessToken;
}
