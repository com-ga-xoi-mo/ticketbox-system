import { z } from 'zod';

export const ROLE_CODES = ['AUDIENCE', 'ORGANIZER', 'CHECKIN_STAFF', 'ADMIN'] as const;

export const RoleCodeSchema = z.enum(ROLE_CODES);
export type RoleCode = z.infer<typeof RoleCodeSchema>;


export const RegisterRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().min(1),
    phone: z.string().regex(/^\+?[0-9]{7,15}$/).optional(),
  })
  .strict();
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

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

export const GenderSchema = z.enum(['MALE', 'FEMALE', 'OTHER']);
export type Gender = z.infer<typeof GenderSchema>;

export const UpdateMyProfileRequestSchema = z.object({
  displayName: z.string().min(1).optional(),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/).nullable().optional(),
  dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
  gender: GenderSchema.nullable().optional(),
  addressLine: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
}).strict();
export type UpdateMyProfileRequest = z.infer<typeof UpdateMyProfileRequestSchema>;

export const UpdateMyPasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
}).strict();
export type UpdateMyPasswordRequest = z.infer<typeof UpdateMyPasswordRequestSchema>;

export const UpdateMyPasswordResponseSchema = z.object({
  success: z.literal(true),
}).strict();
export type UpdateMyPasswordResponse = z.infer<typeof UpdateMyPasswordResponseSchema>;

export const AvatarResponseSchema = z.object({
  avatarAssetId: z.string().uuid(),
  avatarUrl: z.string().min(1).nullable(),
}).strict();
export type AvatarResponse = z.infer<typeof AvatarResponseSchema>;

export const StaffProfileResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().min(1),
    roles: z.array(RoleCodeSchema),
    phone: z.string().nullable().optional(),
    dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
    gender: GenderSchema.nullable().optional(),
    addressLine: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    avatarAssetId: z.string().uuid().nullable().optional(),
    avatarUrl: z.string().min(1).nullable().optional(),
  })
  .strict();
export type StaffProfileResponse = z.infer<typeof StaffProfileResponseSchema>;

export const MyProfileResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().min(1),
    roles: z.array(RoleCodeSchema),
    phone: z.string().nullable().optional(),
    dateOfBirth: z.string().datetime({ offset: true }).nullable().optional(),
    gender: GenderSchema.nullable().optional(),
    addressLine: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    district: z.string().nullable().optional(),
    avatarAssetId: z.string().uuid().nullable().optional(),
    avatarUrl: z.string().min(1).nullable().optional(),
  })
  .strict();
export type MyProfileResponse = z.infer<typeof MyProfileResponseSchema>;
