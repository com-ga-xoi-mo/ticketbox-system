export const PROFILE_QUERY = Symbol('ProfileQuery');

export interface ProfileProjection {
  email: string;
  displayName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  addressLine: string | null;
  city: string | null;
  district: string | null;
  avatarAssetId: string | null;
  avatarUrl: string | null;
}

export interface ProfileQueryPort {
  findByUserId(userId: string): Promise<ProfileProjection | null>;
}
