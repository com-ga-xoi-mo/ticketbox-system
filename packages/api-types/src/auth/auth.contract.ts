import { z } from 'zod';

export const ROLE_CODES = ['AUDIENCE', 'ORGANIZER', 'CHECKIN_STAFF', 'ADMIN'] as const;

export const RoleCodeSchema = z.enum(ROLE_CODES);
export type RoleCode = z.infer<typeof RoleCodeSchema>;

export const LoginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z
  .object({
    accessToken: z.string().min(1),
  })
  .strict();
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const StaffProfileResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().min(1),
    roles: z.array(RoleCodeSchema),
  })
  .strict();
export type StaffProfileResponse = z.infer<typeof StaffProfileResponseSchema>;

export const MyProfileResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().min(1),
    roles: z.array(RoleCodeSchema),
  })
  .strict();
export type MyProfileResponse = z.infer<typeof MyProfileResponseSchema>;
